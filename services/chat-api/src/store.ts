import type { ChatMember, ConversationMessage, NotificationItem, ParticipationStatus } from '@event-buddy/contracts'

export interface EventRecord {
  id: string
  title: string
  ownerUserId: string
  participations: Map<string, ParticipationStatus>
}

export interface ConversationRecord {
  id: string
  kind: 'event' | 'direct'
  eventId?: string
  title: string
  ownerUserId: string
  memberIds: Set<string>
  createdAt: string
}

// In-memory fixtures for isolated tests and standalone demos. Normal startup
// injects PostgresChats for messages and conversations; these maps never serve
// as a fallback if persistent storage is unavailable.
export class MemoryChatStore {
  users = new Map<string, ChatMember>()
  events = new Map<string, EventRecord>()
  conversations = new Map<string, ConversationRecord>()
  messages = new Map<string, ConversationMessage[]>()
  notifications = new Map<string, NotificationItem[]>()
}
