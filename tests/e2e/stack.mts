import { spawn, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { chatOrigin, controlOrigin, eventsOrigin, portBase, testDatabaseUrl, webOrigin } from './settings.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const name = `chat_browser_${randomUUID().replaceAll('-', '')}`
const admin = new pg.Pool({ connectionString: testDatabaseUrl() })
const url = new URL(testDatabaseUrl())
url.pathname = `/${name}`
const database = new pg.Pool({ connectionString: url.toString() })
const children = new Set<ChildProcess>()
const env = { ...process.env, DATABASE_URL: url.toString(), NODE_ENV: 'test',
  ALLOW_DEV_AUTH: 'true', FIREBASE_PROJECT_ID: '', CHAT_DEV_MODE: 'true',
  WEB_ORIGIN: webOrigin, HOST: '127.0.0.1',
  VITE_EVENTS_API_URL: eventsOrigin, VITE_CHAT_API_URL: chatOrigin }
let created = false
let chat: ChildProcess
let stopping: Promise<void> | undefined
let restarting: Promise<void> | undefined

function start(label: string, args: string[], cwd = root, extraEnv: NodeJS.ProcessEnv = {}) {
  const child = spawn(process.execPath, args, { cwd, env: { ...env, ...extraEnv }, stdio: ['ignore', 'pipe', 'pipe'] })
  children.add(child)
  child.stdout?.on('data', (data) => process.stdout.write(`[${label}] ${data}`))
  child.stderr?.on('data', (data) => process.stderr.write(`[${label}] ${data}`))
  child.on('error', (error) => console.error(`[${label}]`, error))
  return child
}

function startChat() {
  // Run the real entry point: it wires PostgresChats, authoritative membership,
  // and PostgresNotifications exactly as normal startup does. No memory adapter.
  return start('chat', ['--import', 'tsx', 'services/chat-api/src/index.ts'], root, { PORT: String(portBase + 2) })
}

async function ready(origin: string, path: string, child: ChildProcess) {
  const deadline = Date.now() + 45_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Test service exited before readiness: ${origin}`)
    try {
      const response = await fetch(origin + path, { signal: AbortSignal.timeout(1_000) })
      await response.arrayBuffer()
      if (response.ok) return
    } catch { /* Retry until ready, bounded by the startup deadline. */ }
    await delay(100)
  }
  throw new Error(`Test service did not start: ${origin}`)
}

async function stop(child: ChildProcess) {
  children.delete(child)
  if (child.exitCode !== null || child.signalCode !== null) return
  const exited = once(child, 'exit')
  const timeout = setTimeout(() => child.kill('SIGKILL'), 5_000)
  try { child.kill('SIGTERM'); await exited }
  finally { clearTimeout(timeout) }
}

const control = createServer(async (request, response) => {
  try {
    if (request.method === 'GET' && request.url === '/state') {
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify({ database: name }))
    } else if (request.method === 'GET' && request.url === '/health') {
      const health = await fetch(`${chatOrigin}/health`).then((result) => result.json())
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify({ ...health, database: name }))
    } else if (request.method === 'POST' && request.url === '/shutdown') {
      response.writeHead(202).end()
      void cleanup().catch((error) => { console.error(error); process.exitCode = 1 })
    } else if (request.method === 'POST' && request.url === '/chat/restart') {
      restarting ??= (async () => {
        await stop(chat)
        chat = startChat()
        await ready(chatOrigin, '/health', chat)
      })().finally(() => { restarting = undefined })
      await restarting
      response.writeHead(204).end()
    } else response.writeHead(404).end()
  } catch (error) {
    console.error(error)
    response.writeHead(503).end('Test stack unavailable')
  }
})

function cleanup() {
  return stopping ??= (async () => {
    if (control.listening) await new Promise<void>((done) => control.close(() => done()))
    await Promise.all([...children].map(stop))
    await database.end()
    if (created) await admin.query(`DROP DATABASE ${name} WITH (FORCE)`)
    await admin.end()
  })()
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => {
  void cleanup().then(() => { process.exitCode = 0 }, (error) => { console.error(error); process.exitCode = 1 })
})

try {
  await admin.query(`CREATE DATABASE ${name}`)
  created = true
  for (const migration of ['001_initial_schema.sql', '002_event_city_and_notes.sql', '003_realtime_event_notifications.sql']) {
    await database.query(await readFile(resolve(root, 'database/migrations', migration), 'utf8'))
  }
  await database.query(`INSERT INTO app_users(firebase_uid, email, display_name) VALUES
    ('demo-cathy', 'cathy@example.test', 'Cathy Chen'), ('demo-mina', 'mina@example.test', 'Mina Park'),
    ('demo-alex', 'alex@example.test', 'Alex Rivera'), ('demo-nadia', 'nadia@example.test', 'Nadia Chen')`)
  await database.query("INSERT INTO categories(name) VALUES ('Music')")
  const events = start('events', ['--import', 'tsx', 'services/events-api/src/index.ts'], root, { PORT: String(portBase + 1) })
  chat = startChat()
  const webRoot = resolve(root, 'apps/web')
  const web = start('web', [resolve(webRoot, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(portBase), '--strictPort'], webRoot)
  await Promise.all([ready(eventsOrigin, '/health', events), ready(chatOrigin, '/health', chat), ready(webOrigin, '/', web)])
  const health = await fetch(`${chatOrigin}/health`).then((response) => response.json())
  if (health.storage !== 'postgresql' || health.notifications !== 'postgresql' || health.membership !== 'events-postgresql') {
    throw new Error('Browser tests require PostgreSQL chat, notifications, and authoritative event membership')
  }
  control.listen(portBase + 3, '127.0.0.1')
  await once(control, 'listening')
  console.info(`Persistent chat browser stack ready: ${controlOrigin}`)
} catch (error) {
  console.error(error)
  await cleanup()
  process.exitCode = 1
}
