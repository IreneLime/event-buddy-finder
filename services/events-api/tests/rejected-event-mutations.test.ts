import assert from 'node:assert/strict'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, test } from 'node:test'
import pg from 'pg'

if (process.env.REQUIRE_REJECTED_MUTATION_TESTS === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('Set TEST_DATABASE_URL to run the rejected event mutation integration tests.')
}

describe('rejected event mutations', { skip: !process.env.TEST_DATABASE_URL }, () => {
  const databaseName = `event_buddy_reject_test_${process.pid}`
  const admin = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL })
  let database: pg.Pool
  let server: Server
  let origin: string
  let eventId: string
  let eventRowBefore: Record<string, unknown>
  let eventCountBefore: number
  let resetPoolForTests: () => void

  const createBody = {
    title: 'Should never be created',
    description: 'Unverified users must not insert this row.',
    startsAt: '2026-12-15T18:00:00Z',
    locationName: 'Blocked venue',
    city: 'Toronto',
    categoryNames: ['Music'],
  }

  before(async () => {
    await admin.query(`CREATE DATABASE ${databaseName}`)
    const url = new URL(process.env.TEST_DATABASE_URL!)
    url.pathname = `/${databaseName}`
    const databaseUrl = url.toString()

    process.env.DATABASE_URL = databaseUrl
    process.env.ALLOW_DEV_AUTH = 'true'
    process.env.NODE_ENV = 'test'
    delete process.env.FIREBASE_PROJECT_ID

    database = new pg.Pool({ connectionString: databaseUrl })
    const poolModule = await import('../src/db/pool.js')
    poolModule.setPoolForTests(database)
    resetPoolForTests = poolModule.resetPoolForTests

    for (const file of [
      '001_initial_schema.sql',
      '002_event_city_and_notes.sql',
      '003_realtime_event_notifications.sql',
      '004_consolidate_schema.sql',
    ]) {
      await database.query(await readFile(new URL(`../../../database/migrations/${file}`, import.meta.url), 'utf8'))
    }
    await database.query(await readFile(new URL('../../../database/seeds/001_demo_data.sql', import.meta.url), 'utf8'))

    const { createEventsApp } = await import('../src/app.js')
    server = createServer(createEventsApp())
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

    const created = await api('/events', 'POST', {
      title: 'Owned rejection fixture',
      description: 'Baseline event used to assert non-owner mutations leave rows unchanged.',
      startsAt: '2026-12-10T18:00:00Z',
      locationName: 'Original venue',
      city: 'Toronto',
      categoryNames: ['Music'],
    }, 'dev:demo-mina', 201)
    eventId = created.id

    eventRowBefore = await snapshotEvent(eventId)
    eventCountBefore = await countEvents()
  })

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
    resetPoolForTests()
    await database.end()
    await admin.query(`DROP DATABASE ${databaseName}`)
    await admin.end()
  })

  async function api(
    path: string,
    method: string,
    body: unknown | undefined,
    authorization: string,
    expected: number,
  ) {
    const response = await fetch(origin + path, {
      method,
      headers: {
        Authorization: `Bearer ${authorization}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await response.json()
    assert.equal(response.status, expected, JSON.stringify(data))
    return data
  }

  async function snapshotEvent(id: string) {
    const result = await database.query(
      `SELECT id, public_id, created_by_user_id, title, description, status,
              location_name, city, starts_at, ends_at, notes, category_names, updated_at
       FROM events
       WHERE COALESCE(public_id, id::text) = $1`,
      [id],
    )
    assert.equal(result.rowCount, 1)
    return result.rows[0] as Record<string, unknown>
  }

  async function countEvents() {
    const result = await database.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM events')
    return result.rows[0].count
  }

  test('rejects a non-owner edit and leaves the event row unchanged', async () => {
    const body = await api(
      `/events/${eventId}`,
      'PATCH',
      { title: 'Hijacked title', locationName: 'Hijacked venue' },
      'dev:demo-cathy',
      403,
    )
    assert.equal(body.error, 'You do not have permission to manage this event')
    assert.deepEqual(await snapshotEvent(eventId), eventRowBefore)
    assert.equal(await countEvents(), eventCountBefore)
  })

  test('rejects a non-owner cancellation and leaves the event row unchanged', async () => {
    const body = await api(`/events/${eventId}`, 'DELETE', undefined, 'dev:demo-cathy', 403)
    assert.equal(body.error, 'You do not have permission to manage this event')
    assert.deepEqual(await snapshotEvent(eventId), eventRowBefore)
    assert.equal(await countEvents(), eventCountBefore)
  })

  test('rejects an unverified user creating an event and inserts no row', async () => {
    const body = await api('/events', 'POST', createBody, 'dev-unverified:demo-mina', 403)
    assert.equal(body.error, 'Email verification is required before creating events')
    assert.equal(await countEvents(), eventCountBefore)
    assert.deepEqual(await snapshotEvent(eventId), eventRowBefore)
  })
})
