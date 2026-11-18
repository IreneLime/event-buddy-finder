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

// Messages/direct chats are still in memory. In integrated mode the event and
// member collections are rendering projections of the events API's PostgreSQL
// records, refreshed by EventChatAccess before every read/send and broadcast.
// They are not an independent source of event ownership or RSVP permissions.
export class MemoryChatStore {
  users = new Map<string, ChatMember>()
  events = new Map<string, EventRecord>()
  conversations = new Map<string, ConversationRecord>()
  messages = new Map<string, ConversationMessage[]>()
  notifications = new Map<string, NotificationItem[]>()
}
