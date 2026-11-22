export const portBase = Number(process.env.E2E_PORT_BASE ?? 4180)
if (!Number.isInteger(portBase) || portBase < 1024 || portBase > 65532) throw new Error('Invalid E2E_PORT_BASE')
export const webOrigin = `http://127.0.0.1:${portBase}`
export const eventsOrigin = `http://127.0.0.1:${portBase + 1}`
export const chatOrigin = `http://127.0.0.1:${portBase + 2}`
export const controlOrigin = `http://127.0.0.1:${portBase + 3}`

export function testDatabaseUrl() {
  const url = process.env.TEST_DATABASE_URL
  if (!url) throw new Error('Set TEST_DATABASE_URL to a local PostgreSQL server with CREATE DATABASE permission. The browser stack creates and drops its own disposable database.')
  return url
}
