import pg from 'pg'
import type { NotificationItem, NotificationPage } from '@event-buddy/contracts'
import { HttpError } from './errors.js'

export interface NotificationStore {
  list(userId: string, before?: string): Promise<NotificationPage>
  read(userId: string, id: string): Promise<NotificationItem>
  readAll(userId: string): Promise<void>
  subscribe?(publish: (userId: string, notification: NotificationItem) => void): void
  close?(): Promise<void>
}

interface NotificationRow {
  id: string
  recipient_user_id: string
  kind: NotificationItem['kind']
  event_id: string
  event_title: string
  message: string
  created_at: Date
  read_at: Date | null
}

const selectNotification = `SELECT n.id::text, n.recipient_user_id, n.kind,
  COALESCE(e.public_id, e.id::text) AS event_id, e.title AS event_title,
  n.message, n.created_at, n.read_at FROM notifications n JOIN events e ON e.id = n.event_id`

function item(row: NotificationRow): NotificationItem {
  return { id: row.id, kind: row.kind, eventId: row.event_id, eventTitle: row.event_title,
    message: row.message, createdAt: row.created_at.toISOString(), readAt: row.read_at?.toISOString() }
}

export class PostgresNotifications implements NotificationStore {
  private pool: pg.Pool
  private listener?: pg.PoolClient
  private timer?: ReturnType<typeof setInterval>
  private pending?: Promise<void>
  private closed = false

  constructor(connectionString: string, private demoMode = false) {
    this.pool = new pg.Pool({ connectionString, max: 5, connectionTimeoutMillis: 3_000 })
    this.pool.on('error', (error) => console.error('Notification database connection failed:', error.message))
  }

  private databaseUser(userId: string) { return this.demoMode ? `demo-${userId}` : userId }
  private socketUser(userId: string) { return this.demoMode && userId.startsWith('demo-') ? userId.slice(5) : userId }

  async list(userId: string, before?: string): Promise<NotificationPage> {
    if (before !== undefined && !/^\d+$/.test(before)) throw new HttpError(400, 'INVALID_CURSOR', 'Invalid notification cursor.')
    const recipient = this.databaseUser(userId)
    const [page, unread] = await Promise.all([
      this.pool.query<NotificationRow>(`${selectNotification}
        WHERE n.recipient_user_id = $1 AND ($2::bigint IS NULL OR n.id < $2::bigint)
        ORDER BY n.id DESC LIMIT 51`, [recipient, before ?? null]),
      this.pool.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM notifications WHERE recipient_user_id = $1 AND read_at IS NULL', [recipient]),
    ])
    const rows = page.rows.slice(0, 50)
    return { items: rows.map(item), unreadCount: unread.rows[0].count,
      nextCursor: page.rows.length > 50 ? rows.at(-1)?.id : undefined }
  }

  async read(userId: string, id: string): Promise<NotificationItem> {
    const updated = await this.pool.query('UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE id::text = $1 AND recipient_user_id = $2 RETURNING id', [id, this.databaseUser(userId)])
    if (!updated.rowCount) throw new HttpError(404, 'NOT_FOUND', 'Notification not found.')
    const result = await this.pool.query<NotificationRow>(`${selectNotification} WHERE n.id::text = $1`, [id])
    return item(result.rows[0])
  }

  async readAll(userId: string): Promise<void> {
    await this.pool.query('UPDATE notifications SET read_at = NOW() WHERE recipient_user_id = $1 AND read_at IS NULL', [this.databaseUser(userId)])
  }

  subscribe(publish: (userId: string, notification: NotificationItem) => void) {
    const wake = () => {
      if (this.closed || this.pending) return
      this.pending = this.drain(publish).catch((error: Error) => {
        console.error('Event notification delivery will retry:', error.message)
      }).finally(() => { this.pending = undefined })
    }
    // LISTEN gives immediate delivery; polling recovers missed signals and outages.
    this.timer = setInterval(wake, 1_000)
    this.timer.unref()
    wake()
  }

  private async drain(publish: (userId: string, notification: NotificationItem) => void) {
    if (!this.listener) {
      const connection = await this.pool.connect()
      this.listener = connection
      connection.on('error', () => {
        if (this.listener === connection) { this.listener = undefined; connection.release(true) }
      })
      connection.on('notification', () => {
        // A drain already in progress will pick this up on its next iteration;
        // otherwise the next tick recovers it without losing the saved alert.
        if (!this.pending && !this.closed) {
          this.pending = this.drain(publish).catch((error: Error) => console.error('Event notification delivery will retry:', error.message))
            .finally(() => { this.pending = undefined })
        }
      })
      await connection.query('LISTEN event_notifications')
    }

    while (!this.closed) {
      const client = await this.pool.connect()
      try {
        await client.query('BEGIN')
        const batch = await client.query<NotificationRow>(`${selectNotification}
          WHERE n.published_at IS NULL AND n.event_id IS NOT NULL
          ORDER BY n.id LIMIT 100 FOR UPDATE OF n SKIP LOCKED`)
        for (const row of batch.rows) publish(this.socketUser(row.recipient_user_id), item(row))
        if (batch.rows.length) await client.query('UPDATE notifications SET published_at = NOW() WHERE id = ANY($1::bigint[])', [batch.rows.map((row) => row.id)])
        await client.query('COMMIT')
        if (batch.rows.length < 100) break
      } catch (error) { await client.query('ROLLBACK'); throw error }
      finally { client.release() }
    }
  }

  async close() {
    this.closed = true
    clearInterval(this.timer)
    await this.pending
    if (this.listener) {
      const connection = this.listener
      this.listener = undefined
      await connection.query('UNLISTEN event_notifications').catch(() => {})
      connection.release()
    }
    await this.pool.end()
  }
}
