import { randomUUID } from 'node:crypto'
import type { ConversationDetail, ConversationSummary, MessagePage, NotificationItem } from '@event-buddy/contracts'
import { HttpError, requiredText } from './errors.js'
import { MemoryChatStore, type ConversationRecord } from './store.js'

export class ChatService {
  constructor(public store: MemoryChatStore) {}

  user(userId: string) {
    const user = this.store.users.get(userId)
    if (!user) throw new HttpError(401, 'UNAUTHENTICATED', 'Please sign in with a valid user.')
    return user
  }

  event(eventId: string) {
    const event = this.store.events.get(eventId)
    if (!event) throw new HttpError(404, 'EVENT_NOT_FOUND', 'Event not found.')
    return event
  }

  conversation(id: string, userId: string) {
    const conversation = this.store.conversations.get(id)
    if (!conversation) throw new HttpError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.')
    if (!conversation.memberIds.has(userId)) throw new HttpError(403, 'FORBIDDEN', 'Join this event before accessing its chat.')
    return conversation
  }

  eventConversation(eventId: string) {
    this.event(eventId)
    const conversation = [...this.store.conversations.values()].find((item) => item.eventId === eventId)
    if (!conversation) throw new HttpError(404, 'CONVERSATION_NOT_FOUND', 'This event has no chat.')
    return conversation
  }

  summary(conversation: ConversationRecord, userId: string): ConversationSummary {
    const other = [...conversation.memberIds].find((id) => id !== userId)
    return {
      id: conversation.id, kind: conversation.kind, eventId: conversation.eventId,
      title: conversation.kind === 'direct' ? this.user(other!).displayName : conversation.title,
      memberCount: conversation.memberIds.size, createdAt: conversation.createdAt,
      lastMessage: this.store.messages.get(conversation.id)?.at(-1),
    }
  }

  ListGroupChats(userId: string) {
    return [...this.store.conversations.values()].filter((item) => item.memberIds.has(userId))
      .map((item) => this.summary(item, userId))
      .sort((a, b) => (b.lastMessage?.createdAt ?? b.createdAt).localeCompare(a.lastMessage?.createdAt ?? a.createdAt))
  }

  history(id: string, userId: string, limit = 50, before?: string): MessagePage {
    this.conversation(id, userId)
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new HttpError(400, 'INVALID_INPUT', 'limit must be an integer between 1 and 100.')
    const messages = this.store.messages.get(id) ?? []
    const end = before ? messages.findIndex((message) => message.id === before) : messages.length
    if (end < 0) throw new HttpError(400, 'INVALID_CURSOR', 'Message cursor not found in this conversation.')
    const start = Math.max(0, end - limit)
    return { items: messages.slice(start, end), nextCursor: start > 0 ? messages[start].id : undefined }
  }

  GetGroupChat(id: string, userId: string): ConversationDetail {
    const conversation = this.conversation(id, userId)
    return { ...this.summary(conversation, userId), members: [...conversation.memberIds].map((id) => this.user(id)), messages: this.history(id, userId) }
  }

  CreateGroupChat(eventId: string, title: unknown, userId: string) {
    const cleanTitle = requiredText(title, 'title', 100)
    requiredText(eventId, 'eventId', 150)
    const existing = this.store.events.get(eventId)
    if (existing && existing.ownerUserId !== userId) throw new HttpError(403, 'FORBIDDEN', 'Only the event organizer can create its chat.')
    const chat = [...this.store.conversations.values()].find((item) => item.eventId === eventId)
    if (chat) return this.GetGroupChat(chat.id, userId)
    this.store.events.set(eventId, { id: eventId, title: existing?.title ?? cleanTitle, ownerUserId: userId, participations: new Map([[userId, 'going']]) })
    const id = randomUUID()
    this.store.conversations.set(id, { id, kind: 'event', eventId, title: existing?.title ?? cleanTitle, ownerUserId: userId, memberIds: new Set([userId]), createdAt: new Date().toISOString() })
    this.store.messages.set(id, [])
    return this.GetGroupChat(id, userId)
  }

  participate(eventId: string, userId: string, status: unknown) {
    if (status !== 'interested' && status !== 'going' && status !== 'withdrawn') throw new HttpError(400, 'INVALID_INPUT', 'status must be interested, going, or withdrawn.')
    const event = this.event(eventId)
    const conversation = this.eventConversation(eventId)
    if (event.ownerUserId === userId && status === 'withdrawn') throw new HttpError(409, 'HOST_REQUIRED', 'The organizer must remain in the event chat.')
    event.participations.set(userId, status)
    if (status === 'withdrawn') conversation.memberIds.delete(userId)
    else conversation.memberIds.add(userId)
    return { eventId, status, conversationId: conversation.id }
  }

  UpdateGroupChat(id: string, userId: string, input: { status?: unknown; title?: unknown; kind?: unknown }) {
    const conversation = this.store.conversations.get(id)
    if (!conversation || conversation.kind !== 'event' || !conversation.eventId) throw new HttpError(404, 'CONVERSATION_NOT_FOUND', 'Event group chat not found.')
    if (input.status !== undefined) {
      this.participate(conversation.eventId, userId, input.status)
      return { conversationId: id, status: this.event(conversation.eventId).participations.get(userId), deliveries: [] as { userId: string; notification: NotificationItem }[] }
    }
    const result = this.updateEvent(conversation.eventId, input.title, input.kind, userId)
    return { ...result, conversationId: id }
  }

  join(eventId: string, userId: string) {
    const status = this.event(eventId).participations.get(userId)
    this.participate(eventId, userId, status === 'going' ? 'going' : 'interested')
    return this.GetGroupChat(this.eventConversation(eventId).id, userId)
  }

  updateEvent(eventId: string, title: unknown, kind: unknown, userId: string) {
    const event = this.event(eventId)
    if (event.ownerUserId !== userId) throw new HttpError(403, 'FORBIDDEN', 'Only the event organizer can update its chat.')
    const cleanTitle = requiredText(title, 'title', 100)
    if (kind !== 'event_updated' && kind !== 'event_cancelled') throw new HttpError(400, 'INVALID_INPUT', 'Invalid notification kind.')
    const conversation = this.eventConversation(eventId)
    event.title = conversation.title = cleanTitle
    const deliveries: { userId: string; notification: NotificationItem }[] = []
    for (const [recipient, status] of event.participations) {
      if (recipient === userId || status === 'withdrawn') continue
      const notification: NotificationItem = { id: randomUUID(), eventId, kind, message: `${cleanTitle} ${kind === 'event_cancelled' ? 'has been cancelled.' : 'has been updated.'}`, createdAt: new Date().toISOString() }
      const inbox = this.store.notifications.get(recipient) ?? []
      inbox.unshift(notification)
      this.store.notifications.set(recipient, inbox)
      deliveries.push({ userId: recipient, notification })
    }
    return { conversation: this.GetGroupChat(conversation.id, userId), deliveries }
  }

  DeleteGroupChat(id: string, userId: string) {
    const conversation = this.conversation(id, userId)
    if (conversation.kind !== 'event' || conversation.ownerUserId !== userId) throw new HttpError(403, 'FORBIDDEN', 'Only the event organizer can delete its group chat.')
    this.store.conversations.delete(id)
    this.store.messages.delete(id)
    return [...conversation.memberIds]
  }

  direct(userId: string, target: unknown) {
    const targetId = requiredText(target, 'userId', 150)
    this.user(targetId)
    if (targetId === userId) throw new HttpError(400, 'INVALID_INPUT', 'Choose another user to message.')
    const sharedEvent = [...this.store.events.values()].some((event) => {
      const a = event.participations.get(userId), b = event.participations.get(targetId)
      return a && a !== 'withdrawn' && b && b !== 'withdrawn'
    })
    if (!sharedEvent) throw new HttpError(403, 'FORBIDDEN', 'You must share an event to start a direct message.')
    const existing = [...this.store.conversations.values()].find((item) => item.kind === 'direct' && item.memberIds.has(userId) && item.memberIds.has(targetId))
    if (existing) return this.GetGroupChat(existing.id, userId)
    const id = randomUUID()
    this.store.conversations.set(id, { id, kind: 'direct', title: 'Direct message', ownerUserId: userId, memberIds: new Set([userId, targetId]), createdAt: new Date().toISOString() })
    this.store.messages.set(id, [])
    return this.GetGroupChat(id, userId)
  }

  send(id: unknown, userId: string, body: unknown) {
    const conversationId = requiredText(id, 'conversationId', 150)
    this.conversation(conversationId, userId)
    const message = { id: randomUUID(), conversationId, senderUserId: userId, senderDisplayName: this.user(userId).displayName, body: requiredText(body, 'body', 2000), createdAt: new Date().toISOString() }
    const messages = this.store.messages.get(conversationId) ?? []
    messages.push(message)
    this.store.messages.set(conversationId, messages)
    return message
  }

  inbox(userId: string) { return this.store.notifications.get(userId) ?? [] }

  readNotification(id: string, userId: string) {
    const notification = this.inbox(userId).find((item) => item.id === id)
    if (!notification) throw new HttpError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found.')
    notification.readAt ??= new Date().toISOString()
    return notification
  }
}
