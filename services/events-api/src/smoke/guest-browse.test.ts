import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'

import type pg from 'pg'

import { createApp } from '../app.js'
import { resetPoolForTests, setPoolForTests } from '../db/pool.js'

describe('GET /events as guest', () => {
  let server: Server
  let baseUrl: string

  before(async () => {
    setPoolForTests({
      async query(input: unknown, _values?: unknown) {
        const sql =
          typeof input === 'string'
            ? input
            : typeof input === 'object' && input && 'text' in input
              ? String((input as { text: unknown }).text)
              : String(input)
        if (sql.includes('COUNT(*)::int AS total')) {
          return { rows: [{ total: 0 }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] }
        }
        return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] }
      },
      async connect(): Promise<pg.PoolClient> {
        throw new Error('connect() should not be used in guest browse smoke test')
      },
      on() {
        return this as unknown as pg.Pool
      },
    })

    const app = createApp()
    server = await new Promise<Server>((resolve) => {
      const started = app.listen(0, '127.0.0.1', () => resolve(started))
    })
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  after(async () => {
    resetPoolForTests()
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  })

  it('returns a paginated empty list without authentication', async () => {
    const response = await fetch(`${baseUrl}/events`)
    assert.equal(response.status, 200)

    const body = (await response.json()) as {
      items: unknown[]
      page: number
      limit: number
      total: number
    }

    assert.deepEqual(body.items, [])
    assert.equal(body.page, 1)
    assert.equal(body.limit, 20)
    assert.equal(body.total, 0)
  })
})
