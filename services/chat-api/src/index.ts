import { createChatServer } from './app.js'
import { PostgresNotifications } from './notifications.js'
import { PostgresEventMembership } from './event-membership.js'

const port = Number(process.env.PORT ?? 4002)
const host = process.env.HOST ?? '127.0.0.1'
const devMode = process.env.CHAT_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production'
const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/event_buddy_finder'
const notifications = new PostgresNotifications(databaseUrl, devMode)
const eventMembership = new PostgresEventMembership(databaseUrl, devMode)
const { httpServer, close } = createChatServer({ devMode, webOrigin: process.env.WEB_ORIGIN, notifications, eventMembership })

httpServer.listen(port, host, () => {
  console.info(`Chat/notification service listening on http://${host}:${port} (PostgreSQL notifications, memory chat)`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { void close() })
}
