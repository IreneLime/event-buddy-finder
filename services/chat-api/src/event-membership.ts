import pg from 'pg'
import type { ChatMember } from '@event-buddy/contracts'
import { HttpError, requiredText } from './errors.js'
import type { ChatService } from './chat-service.js'

export interface EventChatMembership {
  id: string
  conversationId: string
  title: string
  ownerUserId: string
  createdAt: string
  members: (ChatMember & { status: 'interested' | 'going' })[]
}

// Events-api is the only writer of event ownership and RSVP status. Chat reads
// those same authoritative rows; its message store never grants membership.
export interface EventMembershipSource {
  user(userId: string): Promise<ChatMember>
  event(eventId: string): Promise<EventChatMembership>
  forUser(userId: string): Promise<EventChatMembership[]>
  close?(): Promise<void>
}

interface EventRow {
  id: string
  public_id: string | null
  title: string
  created_by_user_id: string
  created_at: Date
}

const selectEvent = `SELECT e.id::text, to_jsonb(e)->>'public_id' AS public_id,
  e.title, e.created_by_user_id, e.created_at FROM events e`

export class PostgresEventMembership implements EventMembershipSource {
  private pool: pg.Pool
  constructor(connectionString: string, private demoMode = false) {
    this.pool = new pg.Pool({ connectionString, max: 5, connectionTimeoutMillis: 3_000 })
    this.pool.on('error', (error) => console.error('Event membership database connection failed:', error.message))
  }

  private databaseUser(id: string) { return this.demoMode ? `demo-${id}` : id }
  private chatUser(id: string) { return this.demoMode && id.startsWith('demo-') ? id.slice(5) : id }

  private async query<Row extends pg.QueryResultRow>(sql: string, values: unknown[] = []) {
    try { return await this.pool.query<Row>(sql, values) }
    catch { throw new HttpError(503, 'EVENT_MEMBERSHIP_UNAVAILABLE', 'Cannot verify event membership. Please try again.') }
  }

  async user(userId: string): Promise<ChatMember> {
    const result = await this.query<{ display_name: string }>('SELECT display_name FROM app_users WHERE firebase_uid = $1', [this.databaseUser(userId)])
    if (!result.rows[0]) throw new HttpError(401, 'UNAUTHENTICATED', 'Complete your user profile before opening chat.')
    return { userId, displayName: result.rows[0].display_name }
  }

  private async membership(row: EventRow): Promise<EventChatMembership> {
    const result = await this.query<{ firebase_uid: string; display_name: string; status: 'interested' | 'going' }>(`SELECT u.firebase_uid, u.display_name, COALESCE(p.status, 'going') AS status
      FROM app_users u LEFT JOIN event_participations p ON p.user_id = u.firebase_uid AND p.event_id = $1
      WHERE p.status IN ('interested', 'going')
        OR (u.firebase_uid = $2 AND p.user_id IS NULL)
      ORDER BY u.firebase_uid`, [row.id, row.created_by_user_id])
    return { id: row.public_id ?? row.id, conversationId: `event-${row.id}`, title: row.title,
      ownerUserId: this.chatUser(row.created_by_user_id), createdAt: row.created_at.toISOString(),
      members: result.rows.map((member) => ({ userId: this.chatUser(member.firebase_uid), displayName: member.display_name, status: member.status })) }
  }

  async event(eventId: string): Promise<EventChatMembership> {
    requiredText(eventId, 'eventId', 150)
    const result = await this.query<EventRow>(`${selectEvent} WHERE e.id::text = $1 OR to_jsonb(e)->>'public_id' = $1`, [eventId])
    if (!result.rows[0]) throw new HttpError(404, 'EVENT_NOT_FOUND', 'Event not found.')
    return this.membership(result.rows[0])
  }

  async forUser(userId: string): Promise<EventChatMembership[]> {
    const result = await this.query<EventRow>(`${selectEvent} LEFT JOIN event_participations p ON p.event_id = e.id AND p.user_id = $1
      WHERE p.status IN ('interested', 'going') OR (e.created_by_user_id = $1 AND p.user_id IS NULL)`, [this.databaseUser(userId)])
    return Promise.all(result.rows.map((row) => this.membership(row)))
  }

  async close() { await this.pool.end() }
}

// Materialized metadata for the isolated memory fixture. Normal startup uses
// PostgresChats, which reads the same current RSVP authority inside transactions.
export class EventChatAccess {
  constructor(private service: ChatService, private source?: EventMembershipSource) {}

  async user(userId: string) {
    if (this.source) this.service.store.users.set(userId, await this.source.user(userId))
    return this.service.user(userId)
  }

  private apply(event: EventChatMembership) {
    const store = this.service.store
    for (const member of event.members) store.users.set(member.userId, { userId: member.userId, displayName: member.displayName })
    store.events.set(event.id, { id: event.id, title: event.title, ownerUserId: event.ownerUserId,
      participations: new Map(event.members.map((member) => [member.userId, member.status])) })
    const conversation = { id: event.conversationId, eventId: event.id, title: event.title,
      kind: 'event' as const, ownerUserId: event.ownerUserId,
      memberIds: new Set(event.members.map((member) => member.userId)), createdAt: event.createdAt }
    store.conversations.set(conversation.id, conversation)
    if (!store.messages.has(conversation.id)) store.messages.set(conversation.id, [])
    return conversation
  }

  async event(eventId: string) {
    return this.source ? this.apply(await this.source.event(eventId)) : this.service.eventConversation(eventId)
  }

  async conversation(id: string, userId: string) {
    if (this.source) {
      const existing = this.service.store.conversations.get(id)
      const eventId = existing?.eventId ?? /^event-(\d+)$/.exec(id)?.[1]
      if (eventId) {
        const current = await this.event(eventId)
        if (current.id !== id) throw new HttpError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.')
      }
    }
    return this.service.conversation(id, userId)
  }

  async list(userId: string) {
    if (!this.source) return this.service.ListGroupChats(userId)
    const events = await this.source.forUser(userId)
    const allowed = new Set(events.map((event) => this.apply(event).id))
    return this.service.ListGroupChats(userId).filter((chat) => chat.kind === 'direct' || allowed.has(chat.id))
  }

  async canStartDirect(userId: string, targetId: string) {
    if (!this.source) return
    const events = await this.source.forUser(userId)
    for (const event of events) this.apply(event)
    if (!events.some((event) => event.members.some((member) => member.userId === userId) && event.members.some((member) => member.userId === targetId))) {
      throw new HttpError(403, 'FORBIDDEN', 'You must share an event to start a direct message.')
    }
  }

  async recipients(id: string) {
    const existing = this.service.store.conversations.get(id)
    if (!existing) return []
    const conversation = this.source && existing.eventId ? await this.event(existing.eventId) : existing
    return [...conversation.memberIds]
  }
}
