import pg from 'pg'
import type { ChatMember, ConversationDetail, ConversationMessage, ConversationSummary, MessagePage } from '@event-buddy/contracts'
import { HttpError, requiredText } from './errors.js'

export interface ChatPersistence {
  list(userId: string): Promise<ConversationSummary[]>
  detail(id: string, userId: string): Promise<ConversationDetail>
  event(eventId: string, userId: string): Promise<ConversationDetail>
  history(id: string, userId: string, limit?: number, before?: string): Promise<MessagePage>
  direct(userId: string, target: string): Promise<ConversationDetail>
  send(id: string, userId: string, body: unknown): Promise<{ message: ConversationMessage; recipients: string[] }>
  close(): Promise<void>
}

interface Conversation {
  databaseId: string
  id: string
  kind: 'event' | 'direct'
  eventId?: string
  title: string
  createdAt: string
  members: ChatMember[]
}

interface MessageRow {
  id: string
  sender_user_id: string
  display_name: string
  body: string
  created_at: Date
}

const messageSelect = `SELECT m.id::text, m.sender_user_id, u.display_name, m.body, m.created_at
  FROM messages m JOIN app_users u ON u.firebase_uid = m.sender_user_id`
const active = "('interested', 'going')"

// The normal server uses this adapter. MemoryChatStore is only a test/demo fixture.
// Event authorization always comes from the current RSVP, never the historical
// conversation_members rows: deleting those rows would cascade-delete messages.
export class PostgresChats implements ChatPersistence {
  private pool: pg.Pool

  constructor(connectionString: string, private demoMode = false) {
    this.pool = new pg.Pool({ connectionString, max: 5, connectionTimeoutMillis: 3_000 })
    this.pool.on('error', (error) => console.error('Chat database connection failed:', error.message))
  }

  private databaseUser(id: string) { return this.demoMode ? `demo-${id}` : id }
  private chatUser(id: string) { return this.demoMode && id.startsWith('demo-') ? id.slice(5) : id }

  private async transaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    let client: pg.PoolClient | undefined
    try {
      client = await this.pool.connect()
      await client.query('BEGIN')
      const result = await work(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client?.query('ROLLBACK').catch(() => {})
      if (error instanceof HttpError) throw error
      throw new HttpError(503, 'CHAT_STORAGE_UNAVAILABLE', 'Cannot load or save chat. Please try again.')
    } finally { client?.release() }
  }

  private authorize(conversation: Conversation, userId: string) {
    if (!conversation.members.some((member) => member.userId === userId)) {
      throw new HttpError(403, 'FORBIDDEN', 'Join this event before accessing its chat.')
    }
    return conversation
  }

  private async eventChat(client: pg.PoolClient, eventId: string, userId: string, sending = false): Promise<Conversation> {
    const result = await client.query<{ id: string; public_id: string | null; title: string; created_by_user_id: string; created_at: Date }>(
      `SELECT id::text, public_id, title, created_by_user_id, created_at FROM events
       WHERE id::text = $1 OR public_id = $1 FOR SHARE`, [eventId])
    const event = result.rows[0]
    if (!event) throw new HttpError(404, 'EVENT_NOT_FOUND', 'Event not found.')
    if (sending) {
      // Match events-api's RSVP upsert lock before reading membership. Row locks
      // cannot protect an organizer's implicit access when no RSVP exists yet.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('event-membership:' || $1::text, 0))", [event.id])
    }
    const members = await client.query<{ user_id: string; display_name: string }>(`SELECT u.firebase_uid AS user_id, u.display_name
      FROM app_users u LEFT JOIN event_participations p ON p.user_id = u.firebase_uid AND p.event_id = $1
      WHERE p.status IN ${active} OR (u.firebase_uid = $2 AND p.user_id IS NULL)
      ORDER BY u.firebase_uid`, [event.id, event.created_by_user_id])
    const conversation: Conversation = { databaseId: '', id: `event-${event.id}`, kind: 'event',
      eventId: event.public_id ?? event.id, title: event.title, createdAt: event.created_at.toISOString(),
      members: members.rows.map((member) => ({ userId: this.chatUser(member.user_id), displayName: member.display_name })) }
    this.authorize(conversation, userId)
    let stored = await client.query<{ id: string }>("SELECT id::text FROM conversations WHERE kind = 'event' AND event_id = $1", [event.id])
    if (!stored.rowCount) {
      await client.query(`INSERT INTO conversations(kind, event_id) VALUES ('event', $1)
        ON CONFLICT (event_id) WHERE kind = 'event' DO NOTHING`, [event.id])
      stored = await client.query<{ id: string }>("SELECT id::text FROM conversations WHERE kind = 'event' AND event_id = $1", [event.id])
    }
    conversation.databaseId = stored.rows[0].id
    return conversation
  }

  private async load(client: pg.PoolClient, id: string, userId: string, sending = false): Promise<Conversation> {
    requiredText(id, 'conversationId', 150)
    const eventId = /^event-(\d+)$/.exec(id)?.[1]
    if (eventId) {
      const conversation = await this.eventChat(client, eventId, userId, sending)
      if (conversation.id !== id) throw new HttpError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.')
      return conversation
    }
    const directId = /^direct-(\d+)$/.exec(id)?.[1]
    if (!directId) throw new HttpError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.')
    const result = await client.query<{ id: string; created_at: Date }>(
      "SELECT id::text, created_at FROM conversations WHERE id::text = $1 AND kind = 'direct' FOR SHARE", [directId])
    const row = result.rows[0]
    if (!row) throw new HttpError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.')
    const members = await client.query<{ user_id: string; display_name: string }>(`SELECT cm.user_id, u.display_name
      FROM conversation_members cm JOIN app_users u ON u.firebase_uid = cm.user_id
      WHERE cm.conversation_id = $1 ORDER BY cm.user_id`, [row.id])
    const conversation = this.authorize({ databaseId: row.id, id: `direct-${row.id}`, kind: 'direct', title: '',
      createdAt: row.created_at.toISOString(), members: members.rows.map((member) => ({ userId: this.chatUser(member.user_id), displayName: member.display_name })) }, userId)
    conversation.title = conversation.members.find((member) => member.userId !== userId)?.displayName ?? 'Direct message'
    return conversation
  }

  private message(row: MessageRow, conversationId: string): ConversationMessage {
    return { id: row.id, conversationId, senderUserId: this.chatUser(row.sender_user_id),
      senderDisplayName: row.display_name, body: row.body, createdAt: row.created_at.toISOString() }
  }

  private async page(client: pg.PoolClient, conversation: Conversation, limit = 50, before?: string): Promise<MessagePage> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new HttpError(400, 'INVALID_INPUT', 'limit must be an integer between 1 and 100.')
    if (before !== undefined) {
      if (!/^[1-9]\d{0,18}$/.test(before) || BigInt(before) > 9223372036854775807n) throw new HttpError(400, 'INVALID_CURSOR', 'Invalid message cursor.')
      const cursor = await client.query('SELECT 1 FROM messages WHERE id = $1 AND conversation_id = $2', [before, conversation.databaseId])
      if (!cursor.rowCount) throw new HttpError(400, 'INVALID_CURSOR', 'Message cursor not found in this conversation.')
    }
    // Compare timestamps in PostgreSQL to retain microsecond precision, with id
    // as the tie-breaker for messages sharing the same timestamp.
    const result = await client.query<MessageRow>(`${messageSelect}
      WHERE m.conversation_id = $1 AND ($2::bigint IS NULL OR (m.created_at, m.id) <
        (SELECT created_at, id FROM messages WHERE id = $2 AND conversation_id = $1))
      ORDER BY m.created_at DESC, m.id DESC LIMIT $3`, [conversation.databaseId, before ?? null, limit + 1])
    const items = result.rows.slice(0, limit).reverse().map((row) => this.message(row, conversation.id))
    return { items, nextCursor: result.rows.length > limit ? items[0].id : undefined }
  }

  private async summary(client: pg.PoolClient, conversation: Conversation): Promise<ConversationSummary> {
    const latest = await client.query<MessageRow>(`${messageSelect} WHERE m.conversation_id = $1 ORDER BY m.created_at DESC, m.id DESC LIMIT 1`, [conversation.databaseId])
    return { id: conversation.id, kind: conversation.kind, eventId: conversation.eventId, title: conversation.title,
      createdAt: conversation.createdAt, memberCount: conversation.members.length,
      lastMessage: latest.rows[0] ? this.message(latest.rows[0], conversation.id) : undefined }
  }

  private async describe(client: pg.PoolClient, conversation: Conversation): Promise<ConversationDetail> {
    return { ...await this.summary(client, conversation), members: conversation.members, messages: await this.page(client, conversation) }
  }

  async list(userId: string): Promise<ConversationSummary[]> {
    return this.transaction(async (client) => {
      const events = await client.query<{ id: string }>(`SELECT e.id::text FROM events e
        LEFT JOIN event_participations p ON p.event_id = e.id AND p.user_id = $1
        WHERE p.status IN ${active} OR (e.created_by_user_id = $1 AND p.user_id IS NULL)`, [this.databaseUser(userId)])
      const directs = await client.query<{ id: string }>(`SELECT c.id::text FROM conversations c
        JOIN conversation_members cm ON cm.conversation_id = c.id WHERE c.kind = 'direct' AND cm.user_id = $1`, [this.databaseUser(userId)])
      const summaries: ConversationSummary[] = []
      for (const event of events.rows) {
        // A concurrent withdrawal between listing IDs and loading the event may
        // remove a chat from this response, but must never return stale access.
        try { summaries.push(await this.summary(client, await this.eventChat(client, event.id, userId))) }
        catch (error) { if (!(error instanceof HttpError && error.status === 403)) throw error }
      }
      for (const direct of directs.rows) summaries.push(await this.summary(client, await this.load(client, `direct-${direct.id}`, userId)))
      return summaries.sort((a, b) => (b.lastMessage?.createdAt ?? b.createdAt).localeCompare(a.lastMessage?.createdAt ?? a.createdAt))
    })
  }

  async detail(id: string, userId: string) {
    return this.transaction(async (client) => this.describe(client, await this.load(client, id, userId)))
  }

  async event(eventId: string, userId: string) {
    requiredText(eventId, 'eventId', 150)
    return this.transaction(async (client) => this.describe(client, await this.eventChat(client, eventId, userId)))
  }

  async history(id: string, userId: string, limit = 50, before?: string) {
    return this.transaction(async (client) => this.page(client, await this.load(client, id, userId), limit, before))
  }

  async direct(userId: string, target: string) {
    const targetId = requiredText(target, 'userId', 150)
    if (userId === targetId) throw new HttpError(400, 'INVALID_INPUT', 'Choose another user to message.')
    return this.transaction(async (client) => {
      const users = [this.databaseUser(userId), this.databaseUser(targetId)].sort()
      // All callers use the same ordered pair lock, including reverse requests
      // on another server, so creating a DM concurrently cannot duplicate it.
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [JSON.stringify(users)])
      const shared = await client.query(`SELECT 1 FROM events e
        LEFT JOIN event_participations a ON a.event_id = e.id AND a.user_id = $1
        LEFT JOIN event_participations b ON b.event_id = e.id AND b.user_id = $2
        WHERE (a.status IN ${active} OR (e.created_by_user_id = $1 AND a.user_id IS NULL))
          AND (b.status IN ${active} OR (e.created_by_user_id = $2 AND b.user_id IS NULL)) LIMIT 1`, users)
      if (!shared.rowCount) throw new HttpError(403, 'FORBIDDEN', 'You must share an event to start a direct message.')
      const existing = await client.query<{ id: string }>(`SELECT c.id::text FROM conversations c
        WHERE c.kind = 'direct' AND (SELECT COUNT(*) FROM conversation_members cm WHERE cm.conversation_id = c.id) = 2
          AND EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = c.id AND cm.user_id = $1)
          AND EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = c.id AND cm.user_id = $2)
        ORDER BY c.id LIMIT 1`, users)
      let id = existing.rows[0]?.id
      if (!id) {
        const inserted = await client.query<{ id: string }>("INSERT INTO conversations(kind) VALUES ('direct') RETURNING id::text")
        id = inserted.rows[0].id
        await client.query('INSERT INTO conversation_members(conversation_id, user_id) VALUES ($1, $2), ($1, $3)', [id, ...users])
      }
      return this.describe(client, await this.load(client, `direct-${id}`, userId))
    })
  }

  async send(id: string, userId: string, body: unknown) {
    return this.transaction(async (client) => {
      const conversation = await this.load(client, id, userId, true)
      const text = requiredText(body, 'body', 2000)
      const sender = this.databaseUser(userId)
      await client.query('INSERT INTO conversation_members(conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [conversation.databaseId, sender])
      const saved = await client.query<{ id: string; created_at: Date }>(
        'INSERT INTO messages(conversation_id, sender_user_id, body) VALUES ($1, $2, $3) RETURNING id::text, created_at', [conversation.databaseId, sender, text])
      const message: ConversationMessage = { id: saved.rows[0].id, conversationId: conversation.id, senderUserId: userId,
        senderDisplayName: conversation.members.find((member) => member.userId === userId)!.displayName,
        body: text, createdAt: saved.rows[0].created_at.toISOString() }
      return { message, recipients: conversation.members.map((member) => member.userId) }
    })
  }

  async close() { await this.pool.end() }
}
