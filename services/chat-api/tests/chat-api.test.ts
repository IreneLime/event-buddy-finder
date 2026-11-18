import assert from 'node:assert/strict'
import { once } from 'node:events'
import { after, before, test } from 'node:test'
import { io, type Socket } from 'socket.io-client'
import type { AddressInfo } from 'node:net'
import type { ChatResult, ConversationMessage } from '@event-buddy/contracts'
import { createChatServer } from '../src/app.js'

const server = createChatServer({ devMode: true })
let origin: string
const sockets: Socket[] = []

before(async () => {
  server.httpServer.listen(0, '127.0.0.1')
  await once(server.httpServer, 'listening')
  origin = `http://127.0.0.1:${(server.httpServer.address() as AddressInfo).port}`
})
after(async () => {
  for (const socket of sockets) socket.disconnect()
  await new Promise<void>((resolve) => server.io.close(() => resolve()))
})

async function api(path: string, userId = 'cathy', method = 'GET', body?: unknown) {
  return fetch(`${origin}${path}`, { method, headers: { 'x-demo-user-id': userId, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) })
}

async function connect(userId: string) {
  const socket = io(origin, { auth: { demoUserId: userId }, transports: ['websocket'], forceNew: true, reconnection: false })
  sockets.push(socket)
  await once(socket, 'connect', { signal: AbortSignal.timeout(3000) })
  return socket
}

function send(socket: Socket, conversationId: string, body: unknown) {
  return new Promise<ChatResult<ConversationMessage>>((resolve, reject) => {
    socket.timeout(3000).emit('message:send', { conversationId, body }, (error: Error | null, result: ChatResult<ConversationMessage>) => error ? reject(error) : resolve(result))
  })
}

test('health is public; protected routes and sockets require a valid identity', async () => {
  assert.equal((await fetch(`${origin}/health`)).status, 200)
  assert.equal((await fetch(`${origin}/ListGroupChats`)).status, 401)
  assert.equal((await api('/ListGroupChats', 'unknown')).status, 401)
  assert.throws(() => createChatServer(), /identity verification/)
  assert.throws(() => createChatServer({ verifyIdentity: async () => 'cathy', eventMembership: {
    user: async () => ({ userId: 'cathy', displayName: 'Cathy' }),
    event: async () => { throw new Error('Not used') }, forUser: async () => [],
  } }), /Persistent chat storage/)
  const socket = io(origin, { auth: {}, reconnection: false, forceNew: true })
  sockets.push(socket)
  const [error] = await once(socket, 'connect_error', { signal: AbortSignal.timeout(3000) })
  assert.match(error.message, /sign in/)
})

test('CreateGroupChat is idempotent, starts with its host, and DeleteGroupChat enforces ownership', async () => {
  const first = await api('/CreateGroupChat', 'cathy', 'POST', { eventId: 'test-created', title: 'Test event' })
  assert.equal(first.status, 201)
  const created = await first.json()
  assert.notEqual(created.id, 'test-created')
  assert.deepEqual(created.members.map((member: { userId: string }) => member.userId), ['cathy'])
  const duplicate = await (await api('/CreateGroupChat', 'cathy', 'POST', { eventId: 'test-created', title: 'Test event' })).json()
  assert.equal(duplicate.id, created.id)
  assert.equal((await api('/CreateGroupChat', 'alex', 'POST', { eventId: 'test-created', title: 'Hijack' })).status, 403)
  assert.equal((await api(`/DeleteGroupChat/${created.id}`, 'mina', 'DELETE')).status, 403)
  assert.equal((await api(`/DeleteGroupChat/${created.id}`, 'cathy', 'DELETE')).status, 204)
  assert.equal((await api(`/GetGroupChat/${created.id}`)).status, 404)
})

test('joining marks interest; UpdateGroupChat withdrawal revokes history and message access', async () => {
  assert.equal((await api('/GetGroupChat/chat-clay-club')).status, 403)
  const joined = await (await api('/events/clay-club/conversation/membership', 'cathy', 'POST')).json()
  assert.equal(joined.id, 'chat-clay-club')
  assert.equal(server.service.event('clay-club').participations.get('cathy'), 'interested')
  assert.equal((await api('/UpdateGroupChat/chat-clay-club', 'cathy', 'PATCH', { status: 'withdrawn' })).status, 200)
  assert.equal((await api('/GetGroupChat/chat-clay-club')).status, 403)
  assert.equal((await api('/conversations/chat-clay-club/messages', 'cathy', 'POST', { body: 'blocked' })).status, 403)
  assert.equal((await api('/UpdateGroupChat/chat-night-market', 'mina', 'PATCH', { status: 'withdrawn' })).status, 409)
  assert.equal((await api('/GetGroupChat/does-not-exist')).status, 404)
})

test('messages are isolated by conversation, ordered, and paginated without overlap', async () => {
  for (const body of ['one', 'two', 'three']) assert.equal((await api('/conversations/chat-high-park-walk/messages', 'cathy', 'POST', { body })).status, 201)
  const latest = await (await api('/conversations/chat-high-park-walk/messages?limit=2')).json()
  assert.deepEqual(latest.items.map((message: ConversationMessage) => message.body), ['two', 'three'])
  const previous = await (await api(`/conversations/chat-high-park-walk/messages?limit=2&before=${latest.nextCursor}`)).json()
  assert.deepEqual(previous.items.map((message: ConversationMessage) => message.body), ['one'])
  assert.equal(previous.nextCursor, undefined)
  assert.equal((await api('/conversations/chat-high-park-walk/messages?limit=0')).status, 400)
  assert.equal((await api('/conversations/chat-high-park-walk/messages?before=missing')).status, 400)
  assert.equal((await api('/conversations/chat-high-park-walk/messages', 'cathy', 'POST', { body: '   ' })).status, 400)
  assert.equal((await api('/conversations/chat-high-park-walk/messages', 'cathy', 'POST', { body: 123 })).status, 400)
  assert.equal((await api('/GetGroupChat/mina-dm', 'alex')).status, 403)
  const dm = await (await api('/GetGroupChat/mina-dm')).json()
  assert.equal(dm.messages.items.length, 1)
})

test('Socket.IO delivers once to current members and rejects unauthorized sends', async () => {
  const cathy = await connect('cathy'), mina = await connect('mina'), outsider = await connect('clay-club')
  const observed: ConversationMessage[] = []
  cathy.on('message:created', (message) => observed.push(message))
  const received = once(mina, 'message:created', { signal: AbortSignal.timeout(3000) })
  const result = await send(cathy, 'chat-night-market', 'Hello from a socket')
  assert.equal(result.ok, true)
  const [message] = await received
  assert.equal(message.senderUserId, 'cathy')
  assert.equal(observed.filter((item) => item.id === message.id).length, 1)
  const forbidden = await send(outsider, 'chat-night-market', 'blocked')
  assert.equal(forbidden.ok, false)
  if (!forbidden.ok) assert.equal(forbidden.error.code, 'FORBIDDEN')
  const invalid = await send(cathy, 'chat-night-market', '')
  assert.equal(invalid.ok, false)

  // The delivery target is calculated after withdrawal, even for an already
  // connected socket. No stale conversation-room membership can leak messages.
  await api('/UpdateGroupChat/chat-night-market', 'cathy', 'PATCH', { status: 'withdrawn' })
  const afterLeave = await send(mina, 'chat-night-market', 'For remaining members')
  assert.equal(afterLeave.ok, true)
  const stored = await (await api('/conversations/chat-night-market/messages', 'mina')).json()
  assert.equal(stored.items.at(-1).body, 'For remaining members')
  assert.equal(observed.some((item) => item.body === 'For remaining members'), false)
  const rejected = await send(cathy, 'chat-night-market', 'no longer a member')
  assert.equal(rejected.ok, false)
  await api('/events/night-market/conversation/membership', 'cathy', 'POST')
  for (const socket of [cathy, mina, outsider]) socket.disconnect()
})

test('event updates save offline notifications; only their recipient can mark them read', async () => {
  assert.equal((await api('/UpdateGroupChat/chat-night-market', 'cathy', 'PATCH', { title: 'Not my event', kind: 'event_updated' })).status, 403)
  const cathy = await connect('cathy')
  const alert = once(cathy, 'notification:created', { signal: AbortSignal.timeout(3000) })
  assert.equal((await api('/UpdateGroupChat/chat-night-market', 'mina', 'PATCH', { title: 'New market details', kind: 'event_updated' })).status, 200)
  const [notification] = await alert
  cathy.disconnect()
  const inbox = await (await api('/me/notifications')).json()
  assert.ok(inbox.items.some((item: { id: string }) => item.id === notification.id))
  assert.equal((await api(`/me/notifications/${notification.id}/read`, 'mina', 'PATCH')).status, 404)
  const read = await (await api(`/me/notifications/${notification.id}/read`, 'cathy', 'PATCH')).json()
  assert.ok(read.readAt)
  await api('/UpdateGroupChat/chat-night-market', 'mina', 'PATCH', { title: 'Cancelled market', kind: 'event_cancelled' })
  const offlineInbox = await (await api('/me/notifications')).json()
  assert.equal(offlineInbox.items[0].kind, 'event_cancelled')
})

test('direct conversations require a shared event and cannot be self-created', async () => {
  assert.equal((await api('/conversations/direct', 'cathy', 'POST', { userId: 'cathy' })).status, 400)
  assert.equal((await api('/conversations/direct', 'cathy', 'POST', { userId: 'run-club' })).status, 403)
  const dm = await (await api('/conversations/direct', 'cathy', 'POST', { userId: 'mina' })).json()
  assert.equal(dm.id, 'mina-dm')
  const reverse = await (await api('/conversations/direct', 'mina', 'POST', { userId: 'cathy' })).json()
  assert.equal(reverse.id, dm.id)
  assert.equal(reverse.title, 'Cathy Chen')
})
