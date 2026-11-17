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

// Local integration adapter. These collections are the only storage dependency.
// Replace this adapter and the synchronous service operations with SQL transactions
// when the team's PostgreSQL client and authentication integration are available.
export class MemoryChatStore {
  users = new Map<string, ChatMember>()
  events = new Map<string, EventRecord>()
  conversations = new Map<string, ConversationRecord>()
  messages = new Map<string, ConversationMessage[]>()
  notifications = new Map<string, NotificationItem[]>()
}
