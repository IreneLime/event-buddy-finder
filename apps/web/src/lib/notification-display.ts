import type { NotificationItem } from '@event-buddy/contracts'

export function notificationTitle(notification: NotificationItem) {
  if (notification.kind === 'chat_message') return 'New chat message'
  return notification.kind === 'event_cancelled' ? 'Event cancelled' : 'Event updated'
}

export function notificationHref(notification: NotificationItem) {
  if (notification.conversationId) return '/chats/' + encodeURIComponent(notification.conversationId)
  return notification.eventId ? '/events/' + encodeURIComponent(notification.eventId) : '/notifications'
}
