import { setTimeout as delay } from 'node:timers/promises'
import pg from 'pg'
import { controlOrigin, testDatabaseUrl } from './settings.mjs'

export default async function teardown() {
  const health = await fetch(`${controlOrigin}/state`).then((response) => response.json())
  if (!/^chat_browser_[a-f0-9]+$/.test(health.database)) throw new Error('Unexpected browser-test database name')
  const response = await fetch(`${controlOrigin}/shutdown`, { method: 'POST' })
  if (response.status !== 202) throw new Error('Browser test stack did not accept shutdown')
  // Finish cleanup before Playwright terminates the webServer process group.
  // Signal forwarding through command wrappers must not strand a test database.
  const admin = new pg.Pool({ connectionString: testDatabaseUrl() })
  try {
    const deadline = Date.now() + 15_000
    while (Date.now() < deadline) {
      const result = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [health.database])
      if (!result.rowCount) return
      await delay(100)
    }
    throw new Error(`Browser test database was not removed: ${health.database}`)
  } finally { await admin.end() }
}
