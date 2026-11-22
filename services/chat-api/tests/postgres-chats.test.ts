import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import type { AddressInfo } from 'node:net'
import { after, afterEach, before, beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { io, type Socket } from 'socket.io-client'
import type { ChatResult, ConversationDetail, ConversationMessage, MessagePage } from '@event-buddy/contracts'
import { createChatServer } from '../src/app.js'
import { PostgresChats } from '../src/postgres-chats.js'
import { PostgresEventMembership } from '../src/event-membership.js'

if (process.env.REQUIRE_CHAT_PERSISTENCE_TESTS === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('Set TEST_DATABASE_URL to run the PostgreSQL chat persistence tests.')
}

describe('PostgreSQL chat persistence', { skip: !process.env.TEST_DATABASE_URL, timeout: 20_000 }, () => {
  const name = `chat_persistence_${randomUUID().replaceAll('-', '')}`
  const admin = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL })
  let database: pg.Pool
  let databaseUrl: string
  let createdDatabase = false
  let chat: ReturnType<typeof createChatServer> | undefined
  let processServer: ChildProcess | undefined
  let origin: string
  let eventId: string
  const sockets: Socket[] = []

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
  })

  beforeEach(async () => {
    await database.query('TRUNCATE app_users RESTART IDENTITY CASCADE')
    await database.query(`INSERT INTO app_users(firebase_uid, email, display_name) VALUES
      ('demo-cathy', 'cathy@example.test', 'Cathy Chen'),
      ('demo-mina', 'mina@example.test', 'Mina Park'),
      ('demo-alex', 'alex@example.test', 'Alex Rivera'),
      ('demo-nadia', 'nadia@example.test', 'Nadia Chen')`)
    const event = await database.query<{ id: string }>(`INSERT INTO events(created_by_user_id, title, description, starts_at, location_name, public_id)
      VALUES ('demo-mina', 'Persistent event', 'A chat persistence test.', '2027-01-01T18:00:00Z', 'Toronto', 'persistent-event') RETURNING id::text`)
    eventId = event.rows[0].id
    await database.query(`INSERT INTO event_participations(event_id, user_id, status) VALUES
      ($1, 'demo-cathy', 'interested'), ($1, 'demo-mina', 'going'), ($1, 'demo-alex', 'interested')`, [eventId])
  })

  async function stopServer() {
    for (const socket of sockets.splice(0)) socket.disconnect()
    if (chat) { await chat.close(); chat = undefined }
    if (processServer) {
      const child = processServer
      processServer = undefined
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, 'exit', { signal: AbortSignal.timeout(5_000) })
        child.kill('SIGTERM')
        await exited
      }
    }
  }

  afterEach(stopServer)
  after(async () => {
    await database?.end()
    if (createdDatabase) await admin.query(`DROP DATABASE ${name}`)
    await admin.end()
  })

  async function startServer() {
    chat = createChatServer({ devMode: true,
      eventMembership: new PostgresEventMembership(databaseUrl, true), chats: new PostgresChats(databaseUrl, true) })
    chat.httpServer.listen(0, '127.0.0.1')
    await once(chat.httpServer, 'listening')
    origin = `http://127.0.0.1:${(chat.httpServer.address() as AddressInfo).port}`
  }

  async function startProcess() {
    // Exercise the actual startup wiring, not a new wrapper around a shared
    // memory adapter. Each child has an entirely new heap and connection pools.
    const child = spawn(process.execPath, ['--import', 'tsx', fileURLToPath(new URL('../src/index.ts', import.meta.url))], {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: { ...process.env, DATABASE_URL: databaseUrl, CHAT_DEV_MODE: 'true', NODE_ENV: 'test', HOST: '127.0.0.1', PORT: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    processServer = child
    await new Promise<void>((resolve, reject) => {
      let output = ''
      const timer = setTimeout(() => { reject(new Error(`Chat process startup timed out: ${output}`)) }, 8_000)
      const finished = (error?: Error) => {
        clearTimeout(timer)
        child.off('error', failed)
        child.off('exit', exited)
        error ? reject(error) : resolve()
      }
      const failed = (error: Error) => finished(error)
      const exited = (code: number | null) => finished(new Error(`Chat process exited (${code}): ${output}`))
      child.on('error', failed).on('exit', exited)
      child.stderr!.on('data', (data) => { output += String(data) })
      child.stdout!.on('data', (data) => {
        output += String(data)
        const address = /http:\/\/127\.0\.0\.1:\d+/.exec(output)?.[0]
        if (address) { origin = address; finished() }
      })
    })
  }

  async function api(path: string, user = 'cathy', method = 'GET', body?: unknown, expected = 200) {
    const response = await fetch(origin + path, { method,
      headers: { 'x-demo-user-id': user, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    const data = await response.json()
    assert.equal(response.status, expected, JSON.stringify(data))
    return data
  }

  async function group(): Promise<ConversationDetail> { return api('/events/persistent-event/conversation') }

  async function connect(user: string) {
    const socket = io(origin, { auth: { demoUserId: user }, transports: ['websocket'], forceNew: true, reconnection: false })
    sockets.push(socket)
    await once(socket, 'connect', { signal: AbortSignal.timeout(3_000) })
    return socket
  }

  function send(socket: Socket, conversationId: string, body: string) {
    return new Promise<ChatResult<ConversationMessage>>((resolve, reject) => {
      socket.timeout(3_000).emit('message:send', { conversationId, body }, (error: Error | null, result: ChatResult<ConversationMessage>) => error ? reject(error) : resolve(result))
    })
  }

  test('real server process restarts preserve group/DM messages, membership, IDs, and latest-message summaries', async () => {
    await startProcess()
    assert.equal((await api('/health')).storage, 'postgresql')
    const conversation = await group()
    const cathy = await connect('cathy')
    const alex = await connect('alex')
    const received = once(alex, 'message:created', { signal: AbortSignal.timeout(3_000) })
    const sent = await send(cathy, conversation.id, 'Where do we meet after restart?')
    assert.equal(sent.ok, true)
    if (!sent.ok) return
    assert.deepEqual((await received)[0], sent.data)
    const saved = await database.query('SELECT body FROM messages WHERE id = $1', [sent.data.id])
    assert.equal(saved.rows[0].body, sent.data.body)
    const dm: ConversationDetail = await api('/conversations/direct', 'cathy', 'POST', { userId: 'alex' }, 201)
    const directMessage: ConversationMessage = await api(`/conversations/${dm.id}/messages`, 'alex', 'POST', { body: 'A durable direct reply' }, 201)

    await stopServer()
    await startProcess()
    const restored: ConversationDetail = await group()
    assert.equal(restored.id, conversation.id)
    assert.deepEqual(restored.messages.items, [sent.data])
    const direct: ConversationDetail = await api(`/GetGroupChat/${dm.id}`, 'alex')
    assert.deepEqual(direct.messages.items, [directMessage])
    assert.deepEqual(direct.members.map((member) => member.userId), ['alex', 'cathy'])
    assert.equal((await api('/conversations/direct', 'alex', 'POST', { userId: 'cathy' }, 201)).id, dm.id)
    const list = await api('/ListGroupChats', 'alex')
    assert.deepEqual(list.items.find((item: { id: string }) => item.id === dm.id).lastMessage, directMessage)
    const returning = await connect('cathy')
    assert.equal((await send(returning, conversation.id, 'Still live after restart')).ok, true)
    assert.equal((await api(`/conversations/${conversation.id}/messages`)).items.length, 2)
    await api(`/GetGroupChat/${dm.id}`, 'mina', 'GET', undefined, 403)
    await api(`/conversations/${dm.id}/messages`, 'mina', 'POST', { body: 'Not a DM participant' }, 403)
  })

  test('existing database fixtures and their event/direct history remain readable without a schema change', async () => {
    await database.query('TRUNCATE app_users RESTART IDENTITY CASCADE')
    await database.query(await readFile(new URL('../../../database/seeds/001_demo_data.sql', import.meta.url), 'utf8'))
    await startServer()
    const event: ConversationDetail = await api('/events/night-market/conversation')
    assert.ok(event.messages.items.length > 0)
    const dm: ConversationDetail = await api('/conversations/direct', 'cathy', 'POST', { userId: 'mina' }, 201)
    assert.ok(dm.messages.items.length > 0)
    const stored = await database.query('SELECT id::text FROM messages WHERE conversation_id = $1 ORDER BY created_at, id', [dm.id.slice('direct-'.length)])
    assert.deepEqual(dm.messages.items.map((message) => message.id), stored.rows.map((row) => row.id))
  })

  test('simultaneous reverse requests create one durable two-person direct conversation', async () => {
    await startServer()
    const replies: ConversationDetail[] = await Promise.all(Array.from({ length: 10 }, (_, index) =>
      api('/conversations/direct', index % 2 ? 'alex' : 'cathy', 'POST', { userId: index % 2 ? 'cathy' : 'alex' }, 201)))
    assert.equal(new Set(replies.map((reply) => reply.id)).size, 1)
    assert.equal((await database.query("SELECT COUNT(*)::int AS count FROM conversations WHERE kind = 'direct'")).rows[0].count, 1)
    assert.deepEqual((await database.query<{ participant_one_user_id: string; participant_two_user_id: string }>(
      "SELECT participant_one_user_id, participant_two_user_id FROM conversations WHERE kind = 'direct'")).rows,
    [{ participant_one_user_id: 'demo-alex', participant_two_user_id: 'demo-cathy' }])
    await api('/conversations/direct', 'cathy', 'POST', { userId: 'cathy' }, 400)
    await api('/conversations/direct', 'cathy', 'POST', { userId: 'nadia' }, 403)
  })

  test('history pagination is stable across tied timestamps and rejects cross-conversation cursors', async () => {
    await startServer()
    const conversation = await group()
    const messages: ConversationMessage[] = []
    for (const body of ['one', 'two', 'three', 'four', 'five']) messages.push(await api(`/conversations/${conversation.id}/messages`, 'cathy', 'POST', { body }, 201))
    await database.query("UPDATE messages SET created_at = '2026-11-17T12:00:00.123456Z'")
    const last: MessagePage = await api(`/conversations/${conversation.id}/messages?limit=2`)
    const middle: MessagePage = await api(`/conversations/${conversation.id}/messages?limit=2&before=${last.nextCursor}`)
    const first: MessagePage = await api(`/conversations/${conversation.id}/messages?limit=2&before=${middle.nextCursor}`)
    assert.deepEqual([...first.items, ...middle.items, ...last.items].map((message) => message.id), messages.map((message) => message.id))
    assert.equal(first.nextCursor, undefined)
    const dm = await api('/conversations/direct', 'cathy', 'POST', { userId: 'alex' }, 201)
    await api(`/conversations/${dm.id}/messages?before=${messages[0].id}`, 'cathy', 'GET', undefined, 400)
    for (const query of ['limit=0', 'limit=101', 'before=invalid', 'before=999999999999999999999999']) {
      await api(`/conversations/${conversation.id}/messages?${query}`, 'cathy', 'GET', undefined, 400)
    }
  })

  test('withdrawal revokes existing sockets without deleting the participant\'s previous messages', async () => {
    await startServer()
    const conversation = await group()
    const cathy = await connect('cathy')
    const original = await send(cathy, conversation.id, 'Keep this message for other attendees')
    assert.equal(original.ok, true)
    const observed: ConversationMessage[] = []
    cathy.on('message:created', (message) => observed.push(message))
    await database.query("UPDATE event_participations SET status = 'withdrawn' WHERE event_id = $1 AND user_id = 'demo-cathy'", [eventId])
    await api(`/GetGroupChat/${conversation.id}`, 'cathy', 'GET', undefined, 403)
    await api(`/conversations/${conversation.id}/messages`, 'cathy', 'POST', { body: 'Blocked REST' }, 403)
    const rejected = await send(cathy, conversation.id, 'Blocked socket')
    assert.equal(rejected.ok, false)
    if (!rejected.ok) assert.equal(rejected.error.code, 'FORBIDDEN')
    const remaining: MessagePage = await api(`/conversations/${conversation.id}/messages`, 'mina')
    assert.deepEqual(remaining.items.map((message) => message.body), ['Keep this message for other attendees'])
    await api(`/conversations/${conversation.id}/messages`, 'mina', 'POST', { body: 'Only current participants' }, 201)
    const flushed = once(cathy, 'conversations:changed', { signal: AbortSignal.timeout(3_000) })
    chat!.io.to(cathy.id!).emit('conversations:changed')
    await flushed
    assert.deepEqual(observed, [])
    assert.equal((await database.query('SELECT COUNT(*)::int AS count FROM messages')).rows[0].count, 2)
    assert.equal((await api('/ListGroupChats')).items.length, 0)
  })

  test('profile hard deletion is blocked while chat history or a direct chat references the account', async () => {
    await startServer()
    const eventChat = await group()
    await api(`/conversations/${eventChat.id}/messages`, 'cathy', 'POST', { body: 'Keep event history' }, 201)
    const direct = await api('/conversations/direct', 'cathy', 'POST', { userId: 'alex' }, 201)
    await api(`/conversations/${direct.id}/messages`, 'alex', 'POST', { body: 'Keep direct history' }, 201)

    await assert.rejects(
      database.query("DELETE FROM app_users WHERE firebase_uid = 'demo-cathy'"),
      // PostgreSQL 18 reports RESTRICT as 23001; earlier versions use 23503.
      (error: NodeJS.ErrnoException) => error.code === '23503' || error.code === '23001',
    )
    assert.equal((await database.query("SELECT COUNT(*)::int AS count FROM messages m JOIN app_users u ON u.firebase_uid = m.sender_user_id WHERE u.firebase_uid = 'demo-cathy'")).rows[0].count, 1)
    assert.equal((await database.query("SELECT COUNT(*)::int AS count FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.kind = 'direct'")).rows[0].count, 1)
  })

  test('a COMMIT failure returns errors and never broadcasts or leaves phantom messages', async () => {
    await startServer()
    const conversation = await group()
    const cathy = await connect('cathy')
    const mina = await connect('mina')
    const observed: ConversationMessage[] = []
    mina.on('message:created', (message) => observed.push(message))
    await database.query(`CREATE FUNCTION reject_chat_commit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Simulated commit failure'; END $$;
      CREATE CONSTRAINT TRIGGER reject_chat_commit AFTER INSERT ON messages DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW EXECUTE FUNCTION reject_chat_commit()`)
    try {
      const rejected = await send(cathy, conversation.id, 'Must never appear')
      assert.equal(rejected.ok, false)
      if (!rejected.ok) assert.equal(rejected.error.code, 'CHAT_STORAGE_UNAVAILABLE')
      await api(`/conversations/${conversation.id}/messages`, 'cathy', 'POST', { body: 'Also rolled back' }, 503)
      const flushed = once(mina, 'conversations:changed', { signal: AbortSignal.timeout(3_000) })
      chat!.io.to(mina.id!).emit('conversations:changed')
      await flushed
      assert.deepEqual(observed, [])
      assert.equal((await database.query('SELECT COUNT(*)::int AS count FROM messages')).rows[0].count, 0)
      assert.equal((await database.query("SELECT COUNT(*)::int AS count FROM event_participations WHERE event_id = $1 AND user_id = 'demo-cathy' AND status = 'interested'", [eventId])).rows[0].count, 1)
    } finally {
      await database.query('DROP TRIGGER reject_chat_commit ON messages; DROP FUNCTION reject_chat_commit()')
    }
    assert.equal((await send(cathy, conversation.id, 'Saved after recovery')).ok, true)
    assert.equal((await api(`/conversations/${conversation.id}/messages`)).items.length, 1)
  })

  test('database failures never fall back to memory history, and invalid messages save nothing', async () => {
    await startServer()
    const conversation = await group()
    for (const body of ['', ' ', null, 123, 'x'.repeat(2001)]) await api(`/conversations/${conversation.id}/messages`, 'cathy', 'POST', { body }, 400)
    const saved = await api(`/conversations/${conversation.id}/messages`, 'cathy', 'POST', { body: 'Real database history' }, 201)
    await database.query('ALTER TABLE messages RENAME TO unavailable_messages')
    try {
      for (const path of [`/GetGroupChat/${conversation.id}`, `/conversations/${conversation.id}/messages`, '/ListGroupChats']) {
        const error = await api(path, 'cathy', 'GET', undefined, 503)
        assert.equal(error.code, 'CHAT_STORAGE_UNAVAILABLE')
      }
    } finally { await database.query('ALTER TABLE unavailable_messages RENAME TO messages') }
    assert.deepEqual((await api(`/conversations/${conversation.id}/messages`)).items, [saved])
  })
})
