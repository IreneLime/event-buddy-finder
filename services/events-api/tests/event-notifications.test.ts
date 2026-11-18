import assert from 'node:assert/strict'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, afterEach, before, beforeEach, describe, test } from 'node:test'
import pg from 'pg'
import { io, type Socket } from 'socket.io-client'
import { createChatServer } from '../../chat-api/src/app.js'
import { PostgresNotifications } from '../../chat-api/src/notifications.js'

describe('persistent real-time event notifications', { skip: !process.env.TEST_DATABASE_URL }, () => {
  const databaseName = `event_buddy_notif_test_${process.pid}`
  const admin = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL })
  let database: pg.Pool
  let eventsPool: pg.Pool
  let eventsServer: Server
  let eventsOrigin: string
  let databaseUrl: string
  let chat: ReturnType<typeof createChatServer>
  let chatOrigin: string
  let eventId: string
  const sockets: Socket[] = []

  async function startChat() {
    chat = createChatServer({ devMode: true, notifications: new PostgresNotifications(databaseUrl, true) })
    chat.httpServer.listen(0, '127.0.0.1')
    await once(chat.httpServer, 'listening')
    chatOrigin = `http://127.0.0.1:${(chat.httpServer.address() as AddressInfo).port}`
  }

  before(async () => {
    await admin.query(`CREATE DATABASE ${databaseName}`)
    const url = new URL(process.env.TEST_DATABASE_URL!)
    url.pathname = `/${databaseName}`
    databaseUrl = url.toString()
    process.env.DATABASE_URL = databaseUrl
    process.env.ALLOW_DEV_AUTH = 'true'
    process.env.NODE_ENV = 'test'
    delete process.env.FIREBASE_PROJECT_ID
    database = new pg.Pool({ connectionString: databaseUrl })
    for (const file of ['001_initial_schema.sql', '002_event_city_and_notes.sql', '003_realtime_event_notifications.sql']) {
      await database.query(await readFile(new URL(`../../../database/migrations/${file}`, import.meta.url), 'utf8'))
    }
    await database.query(await readFile(new URL('../../../database/seeds/001_demo_data.sql', import.meta.url), 'utf8'))
    await database.query(`INSERT INTO app_users(firebase_uid, email, display_name) VALUES
      ('demo-former', 'former@example.test', 'Former attendee'),
      ('demo-declined', 'declined@example.test', 'Declined attendee')`)
    const { createEventsApp } = await import('../src/app.js')
    eventsPool = (await import('../src/db/pool.js')).pool
    eventsServer = createServer(createEventsApp())
    eventsServer.listen(0, '127.0.0.1')
    await once(eventsServer, 'listening')
    eventsOrigin = `http://127.0.0.1:${(eventsServer.address() as AddressInfo).port}`
  })

  beforeEach(async () => {
    const event = await eventApi('/events', 'POST', {
      title: 'Notification test event', description: 'A disposable event for notification integration tests.',
      startsAt: '2026-12-01T18:00:00Z', locationName: 'Original venue', city: 'Toronto', categoryNames: ['Music'],
    }, 'mina', 201)
    eventId = event.id
    await database.query(`INSERT INTO event_participations(event_id, user_id, status) VALUES
      ($1, 'demo-mina', 'going'), ($1, 'demo-cathy', 'interested'), ($1, 'demo-alex', 'going'),
      ($1, 'demo-nadia', 'pending_approval'), ($1, 'demo-former', 'withdrawn'), ($1, 'demo-declined', 'declined')`, [eventId])
    await startChat()
  })

  afterEach(async () => {
    for (const socket of sockets.splice(0)) socket.disconnect()
    await chat.close()
    await database.query('DELETE FROM events WHERE id = $1', [eventId])
  })

  after(async () => {
    await new Promise<void>((resolve) => eventsServer.close(() => resolve()))
    await eventsPool.end()
    await database.end()
    await admin.query(`DROP DATABASE ${databaseName}`)
    await admin.end()
  })

  async function eventApi(path: string, method = 'GET', body?: unknown, user = 'mina', expected = 200) {
    const response = await fetch(eventsOrigin + path, { method,
      headers: { Authorization: `Bearer dev:demo-${user}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined })
    const data = await response.json()
    assert.equal(response.status, expected, JSON.stringify(data))
    return data
  }

  async function inbox(user = 'cathy', path = '/me/notifications', method = 'GET', expected = 200) {
    const response = await fetch(chatOrigin + path, { method, headers: { 'x-demo-user-id': user } })
    const data = response.status === 204 ? undefined : await response.json()
    assert.equal(response.status, expected, JSON.stringify(data))
    return data
  }

  async function connect(user: string) {
    const socket = io(chatOrigin, { auth: { demoUserId: user }, transports: ['websocket'], reconnection: false, forceNew: true })
    sockets.push(socket)
    await once(socket, 'connect', { signal: AbortSignal.timeout(5_000) })
    return socket
  }

  async function alerts() {
    return (await database.query('SELECT * FROM notifications WHERE event_id = $1 ORDER BY id', [eventId])).rows
  }

  test('committed changes reach eligible online users and persist for offline/pending users', async () => {
    const cathy = await connect('cathy')
    const outsider = await connect('clay-club')
    const unrelated: unknown[] = []
    outsider.on('notification:created', (notification) => unrelated.push(notification))
    const delivery = once(cathy, 'notification:created', { signal: AbortSignal.timeout(5_000) })
    await eventApi(`/events/${eventId}`, 'PATCH', { startsAt: '2026-12-01T19:00:00Z', locationName: 'New venue' })
    const [notification] = await delivery
    assert.equal(notification.kind, 'event_updated')
    assert.equal(notification.eventId, eventId)
    assert.match(notification.message, /date or time/)
    assert.match(notification.message, /location/)
    assert.deepEqual((await alerts()).map((row) => row.recipient_user_id).sort(), ['demo-alex', 'demo-cathy', 'demo-nadia'])
    assert.equal(unrelated.length, 0)
    const offline = await inbox('nadia')
    assert.equal(offline.items[0].eventId, eventId)
    assert.equal(offline.unreadCount, 1)
  })

  test('unauthorized, invalid, and unchanged saves create no alerts; category-only edits do', async () => {
    await eventApi(`/events/${eventId}`, 'PATCH', { title: 'Hijacked event' }, 'cathy', 403)
    await eventApi(`/events/${eventId}`, 'PATCH', { title: 'Notification test event', categoryNames: ['Music'] })
    assert.equal((await alerts()).length, 0)
    await eventApi(`/events/${eventId}`, 'PATCH', { title: 'Must roll back', categoryNames: ['Missing category'] }, 'mina', 400)
    assert.equal((await eventApi(`/events/${eventId}`)).title, 'Notification test event')
    assert.equal((await alerts()).length, 0)
    await eventApi(`/events/${eventId}`, 'PATCH', { categoryNames: ['Arts'] })
    assert.equal((await alerts()).length, 3)
    assert.match((await alerts())[0].message, /categories/)
  })

  test('a rolled-back event transaction cannot save or publish an alert', async () => {
    const transaction = await database.connect()
    try {
      await transaction.query('BEGIN')
      await transaction.query("SELECT set_config('app.actor_user_id', 'demo-mina', true)")
      await transaction.query("UPDATE events SET title = 'Uncommitted title' WHERE id = $1", [eventId])
      assert.equal((await alerts()).length, 0)
      await transaction.query('ROLLBACK')
      assert.equal((await alerts()).length, 0)
      assert.equal((await eventApi(`/events/${eventId}`)).title, 'Notification test event')
    } finally { transaction.release() }
  })

  test('cancellation notifies remaining attendees once, excluding withdrawn users and the actor', async () => {
    await eventApi(`/events/${eventId}/participation`, 'PUT', { status: 'withdrawn' }, 'cathy')
    await eventApi(`/events/${eventId}`, 'DELETE')
    await eventApi(`/events/${eventId}`, 'DELETE', undefined, 'mina', 400)
    const rows = await alerts()
    assert.deepEqual(rows.map((row) => row.recipient_user_id).sort(), ['demo-alex', 'demo-nadia'])
    assert.ok(rows.every((row) => row.kind === 'event_cancelled'))
    assert.equal((await inbox('cathy')).items.filter((item: { eventId: string }) => item.eventId === eventId).length, 0)
  })

  test('outbox recovery and unread/read state survive a chat service restart', async () => {
    await chat.close()
    await eventApi(`/events/${eventId}`, 'PATCH', { notes: 'Changed while the notification service was offline.' })
    const pending = await database.query('SELECT COUNT(*)::int AS count FROM notification_outbox WHERE published_at IS NULL')
    assert.equal(pending.rows[0].count, 3)
    await startChat()
    const saved = await inbox()
    const id = saved.items[0].id
    assert.equal(saved.unreadCount, 1)
    await inbox('mina', `/me/notifications/${id}/read`, 'PATCH', 404)
    const read = await inbox('cathy', `/me/notifications/${id}/read`, 'PATCH')
    assert.ok(read.readAt)
    await chat.close()
    await startChat()
    assert.equal((await inbox()).unreadCount, 0)
    assert.ok((await inbox()).items.find((item: { id: string }) => item.id === id).readAt)
  })

  test('the inbox paginates and marking all read affects only the current user', async () => {
    for (let index = 0; index < 55; index++) await eventApi(`/events/${eventId}`, 'PATCH', { title: `Update ${index}` })
    const first = await inbox()
    assert.equal(first.items.length, 50)
    assert.equal(first.unreadCount, 55)
    const second = await inbox('cathy', `/me/notifications?before=${first.nextCursor}`)
    assert.equal(second.items.length, 5)
    const ids = [...first.items, ...second.items].map((item: { id: string }) => item.id)
    assert.equal(new Set(ids).size, 55)
    await inbox('cathy', '/me/notifications?before=invalid', 'GET', 400)
    await inbox('cathy', '/me/notifications/read-all', 'PATCH', 204)
    assert.equal((await inbox()).unreadCount, 0)
    assert.equal((await inbox('alex')).unreadCount, 55)
  })

  test('public event aliases and attendee-facing fields survive server reads and edits', async () => {
    const event = await eventApi('/events/night-market')
    assert.equal(event.id, 'night-market')
    assert.equal(event.organizerUserId, 'demo-mina')
    assert.ok(event.notes)
    assert.equal(event.city, 'Toronto')
    await eventApi(`/events/${eventId}`, 'PATCH', { city: 'Markham', notes: 'Meet at the side door.' })
    const updated = await eventApi(`/events/${eventId}`)
    assert.equal(updated.city, 'Markham')
    assert.equal(updated.notes, 'Meet at the side door.')
  })
})
