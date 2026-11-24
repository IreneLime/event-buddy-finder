import { loadEnvFile } from 'node:process'
import { fileURLToPath } from 'node:url'

try {
  loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)))
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}

import { authApiIdentity } from './auth.js'
import { createChatServer } from './app.js'
import { PostgresNotifications } from './notifications.js'
import { PostgresEventMembership } from './event-membership.js'
import { PostgresChats } from './postgres-chats.js'

const port = Number(process.env.PORT ?? 4002)
const host = process.env.HOST ?? '127.0.0.1'
const devMode = process.env.CHAT_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production'
const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/event_buddy_finder'
const notifications = new PostgresNotifications(databaseUrl, devMode)
const eventMembership = new PostgresEventMembership(databaseUrl, devMode)
const chats = new PostgresChats(databaseUrl, devMode)
const verifyIdentity = devMode ? undefined : authApiIdentity(process.env.AUTH_API_URL ?? 'http://localhost:4003')
const { httpServer, close } = createChatServer({
  devMode, webOrigin: process.env.WEB_ORIGIN, notifications, eventMembership, verifyIdentity, chats,
})

httpServer.listen(port, host, () => {
  const address = httpServer.address()
  const listeningPort = typeof address === 'object' && address ? address.port : port
  console.info(`Chat/notification service listening on http://${host}:${listeningPort} (PostgreSQL chats and notifications)`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { void close() })
}
