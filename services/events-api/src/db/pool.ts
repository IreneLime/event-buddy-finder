import pg from 'pg'

import { env } from '../config/env.js'

export type QueryablePool = Pick<pg.Pool, 'query' | 'connect' | 'on'>

const defaultPool = new pg.Pool({
  connectionString: env.databaseUrl,
})

defaultPool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error', error)
})

let activePool: QueryablePool = defaultPool

export function getPool(): QueryablePool {
  return activePool
}

/** Test-only: swap the pool used by repositories. */
export function setPoolForTests(pool: QueryablePool): void {
  activePool = pool
}

export function resetPoolForTests(): void {
  activePool = defaultPool
}

/** @deprecated Prefer getPool(); kept for any direct imports. */
export const pool = new Proxy({} as pg.Pool, {
  get(_target, property, receiver) {
    const value = Reflect.get(activePool, property, receiver)
    return typeof value === 'function' ? value.bind(activePool) : value
  },
})
