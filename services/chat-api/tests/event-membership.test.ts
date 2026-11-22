import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { resolve } from 'node:path'
import { after, before, describe, test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import pg from 'pg'
import { io, type Socket } from 'socket.io-client'
import type { ChatResult, ConversationDetail, ConversationMessage } from '@event-buddy/contracts'
import { createChatServer } from '../src/app.js'
import { PostgresEventMembership } from '../src/event-membership.js'

if (process.env.REQUIRE_EVENT_MEMBERSHIP_TESTS === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('Set TEST_DATABASE_URL to run the real events API membership regression.')
}

// Use the actual events API now available on main. An explicit path can select
// another checkout when checking compatibility with an events owner branch.
describe('events API owns event-chat membership', {
  skip: !process.env.TEST_DATABASE_URL,
}, () => {
  const name = `chat_membership_${process.pid}_${randomUUID().replaceAll('-', '')}`
  const admin = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL })
  let database: pg.Pool | undefined
  let eventsPool: pg.Pool | undefined
  let eventsServer: Server | undefined
  let chat: ReturnType<typeof createChatServer> | undefined
  let databaseUrl: string
  let eventsOrigin: string
  let chatOrigin: string
  let createdDatabase = false
  const sockets: Socket[] = []
  const host = `new-host-${process.pid}`
  const guest = `new-guest-${process.pid}`

  async function startChat() {
    chat = createChatServer({ devMode: true, eventMembership: new PostgresEventMembership(databaseUrl, true) })
    chat.httpServer.listen(0, '127.0.0.1')
    await once(chat.httpServer, 'listening')
    chatOrigin = `http://127.0.0.1:${(chat.httpServer.address() as AddressInfo).port}`
  }

  before(async () => {
    await admin.query(`CREATE DATABASE ${name}`)
    createdDatabase = true
    const url = new URL(process.env.TEST_DATABASE_URL!)
    url.pathname = `/${name}`
    databaseUrl = url.toString()
    database = new pg.Pool({ connectionString: databaseUrl })
    for (const migration of ['001_initial_schema.sql', '002_event_city_and_notes.sql', '003_realtime_event_notifications.sql', '004_consolidate_schema.sql']) {
      await database.query(await readFile(new URL(`../../../database/migrations/${migration}`, import.meta.url), 'utf8'))
    }
    await database.query(`INSERT INTO app_users(firebase_uid, email, display_name) VALUES
      ($1, 'host@example.test', 'Fresh Event Host'), ($2, 'guest@example.test', 'Fresh RSVP Guest')`, [`demo-${host}`, `demo-${guest}`])
    process.env.DATABASE_URL = databaseUrl
    process.env.ALLOW_DEV_AUTH = 'true'
    process.env.NODE_ENV = 'test'
    delete process.env.FIREBASE_PROJECT_ID
    const root = resolve(process.env.EVENTS_API_TEST_ROOT ?? fileURLToPath(new URL('../../events-api/', import.meta.url)))
    const { createApp } = await import(pathToFileURL(resolve(root, 'src/app.ts')).href)
    eventsPool = (await import(pathToFileURL(resolve(root, 'src/db/pool.ts')).href)).pool
    eventsServer = createServer(createApp())
    eventsServer.listen(0, '127.0.0.1')
    await once(eventsServer, 'listening')
    eventsOrigin = `http://127.0.0.1:${(eventsServer.address() as AddressInfo).port}`
    await startChat()
  })

  after(async () => {
    for (const socket of sockets) socket.disconnect()
    await chat?.close()
    if (eventsServer?.listening) await new Promise<void>((done) => eventsServer!.close(() => done()))
    await eventsPool?.end()
    await database?.end()
    if (createdDatabase) await admin.query(`DROP DATABASE ${name}`)
    await admin.end()
  })

  async function eventApi(path: string, user = host, method = 'GET', body?: unknown) {
    const response = await fetch(eventsOrigin + path, { method,
      headers: { authorization: `Bearer dev:demo-${user}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body) })
    const result = await response.json()
    assert.ok(response.ok, `${response.status}: ${JSON.stringify(result)}`)
    return result
  }

  function chatApi(path: string, user = host, method = 'GET', body?: unknown) {
    return fetch(chatOrigin + path, { method,
      headers: { 'x-demo-user-id': user, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body) })
  }

  async function createEvent() {
    return eventApi('/events', host, 'POST', {
      title: 'Brand new event', description: 'Created through the real events API for the chat membership regression.',
      startsAt: '2027-01-01T18:00:00Z', locationName: 'Test venue', categoryNames: ['Music'],
    })
  }

  async function connect(userId: string) {
    const socket = io(chatOrigin, { auth: { demoUserId: userId }, transports: ['websocket'], reconnection: false, forceNew: true })
    sockets.push(socket)
    await once(socket, 'connect', { signal: AbortSignal.timeout(5_000) })
    return socket
  }

  function send(socket: Socket, id: string, body: string) {
    return new Promise<ChatResult<ConversationMessage>>((done, reject) => {
      socket.timeout(5_000).emit('message:send', { conversationId: id, body }, (error: Error | null, result: ChatResult<ConversationMessage>) => error ? reject(error) : done(result))
    })
  }

  test('create event → RSVP → chat → event-page withdrawal revokes REST and existing socket access', async () => {
    const event = await createEvent()
    // No CreateGroupChat call, seeded event, or chat-side membership mutation.
    const hostResponse = await chatApi(`/events/${event.id}/conversation`)
    assert.equal(hostResponse.status, 200)
    const conversation: ConversationDetail = await hostResponse.json()
    assert.deepEqual(conversation.members.map((member) => member.userId), [host])
    assert.equal((await chatApi(`/events/${event.id}/conversation`, guest)).status, 403)
    assert.equal((await chatApi('/CreateGroupChat', host, 'POST', { eventId: 'invented', title: 'Fake' })).status, 404)
    await eventApi(`/events/${event.id}/participation`, guest, 'PUT', { status: 'interested' })
    const joined: ConversationDetail = await (await chatApi(`/events/${event.id}/conversation`, guest)).json()
    assert.equal(joined.id, conversation.id)
    assert.equal(joined.members.find((member) => member.userId === guest)?.displayName, 'Fresh RSVP Guest')
    assert.ok((await (await chatApi('/ListGroupChats', guest)).json()).items.some((item: { id: string }) => item.id === joined.id))
    await eventApi(`/events/${event.id}/participation`, guest, 'PUT', { status: 'going' })
    const socket = await connect(guest)
    assert.equal((await send(socket, joined.id, 'Before withdrawing')).ok, true)
    const observed: ConversationMessage[] = []
    socket.on('message:created', (message) => observed.push(message))

    await eventApi(`/events/${event.id}/participation`, guest, 'PUT', { status: 'withdrawn' })
    // Deliberately leave the old memory projection present: it must not grant access.
    assert.equal(chat!.service.store.conversations.get(joined.id)!.memberIds.has(guest), true)
    for (const path of [`/events/${event.id}/conversation`, `/GetGroupChat/${joined.id}`,
      `/conversations/${joined.id}/members`, `/conversations/${joined.id}/messages`]) {
      assert.equal((await chatApi(path, guest)).status, 403, path)
    }
    assert.equal((await chatApi(`/conversations/${joined.id}/messages`, guest, 'POST', { body: 'Blocked REST' })).status, 403)
    const rejected = await send(socket, joined.id, 'Blocked socket')
    assert.equal(rejected.ok, false)
    if (!rejected.ok) assert.equal(rejected.error.code, 'FORBIDDEN')
    assert.equal((await chatApi(`/conversations/${joined.id}/messages`, host, 'POST', { body: 'Only current members' })).status, 201)
    await delay(30)
    assert.equal(observed.length, 0, 'A socket connected before withdrawal must receive no later messages')
    assert.equal((await (await chatApi('/ListGroupChats', guest)).json()).items.some((item: { id: string }) => item.id === joined.id), false)
    assert.equal((await chatApi(`/events/${event.id}/conversation/membership`, guest, 'POST')).status, 403)
    assert.equal((await chatApi(`/UpdateGroupChat/${joined.id}`, guest, 'PATCH', { status: 'going' })).status, 409)
    assert.equal((await chatApi('/conversations/direct', guest, 'POST', { userId: host })).status, 403)
    assert.equal((await eventApi(`/events/${event.id}`, guest)).viewerParticipation, 'withdrawn')

    socket.disconnect()
    await chat!.close()
    await startChat()
    const afterRestart = await chatApi(`/events/${event.id}/conversation`)
    assert.equal(afterRestart.status, 200)
    assert.equal((await afterRestart.json()).id, joined.id)
    assert.equal((await chatApi(`/GetGroupChat/${joined.id}`, guest)).status, 403)
  })

  test('an explicit creator withdrawal also overrides implicit creator access', async () => {
    const event = await createEvent()
    assert.equal((await chatApi(`/events/${event.id}/conversation`)).status, 200)
    await eventApi(`/events/${event.id}/participation`, host, 'PUT', { status: 'withdrawn' })
    assert.equal((await chatApi(`/events/${event.id}/conversation`)).status, 403)
    await eventApi(`/events/${event.id}/participation`, host, 'PUT', { status: 'going' })
    assert.equal((await chatApi(`/events/${event.id}/conversation`)).status, 200)
  })

  test('membership lookup failures never fall back to previously cached access', async () => {
    const event = await createEvent()
    const conversation: ConversationDetail = await (await chatApi(`/events/${event.id}/conversation`)).json()
    const socket = await connect(host)
    await database!.query('ALTER TABLE event_participations RENAME TO unavailable_participations')
    try {
      assert.equal((await chatApi(`/GetGroupChat/${conversation.id}`)).status, 503)
      assert.equal((await chatApi(`/conversations/${conversation.id}/messages`, host, 'POST', { body: 'Must fail closed' })).status, 503)
      const result = await send(socket, conversation.id, 'Must fail closed')
      assert.equal(result.ok, false)
      if (!result.ok) assert.equal(result.error.code, 'EVENT_MEMBERSHIP_UNAVAILABLE')
    } finally { await database!.query('ALTER TABLE unavailable_participations RENAME TO event_participations') }
    const restored = await chatApi(`/GetGroupChat/${conversation.id}`)
    assert.equal(restored.status, 200)
    assert.deepEqual((await restored.json()).messages.items, [], 'Failed authority lookups must not save messages')
    socket.disconnect()
  })
})
