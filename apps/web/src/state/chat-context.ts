import { createContext, useContext } from 'react'
import type { ConversationSummary, NotificationItem } from '@event-buddy/contracts'
import type { ChatApi, ChatSocket } from '../lib/chat-api'

export interface ChatState {
  userId: string | undefined
  api: ChatApi
  socket: ChatSocket
  conversations: ConversationSummary[]
  notifications: NotificationItem[]
  unreadCount: number
  nextNotificationCursor?: string
  liveAlerts: NotificationItem[]
  dismissAlert: (id: string) => void
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
  loadMoreNotifications: () => Promise<void>
  browserAlertsEnabled: boolean
  browserPermission: NotificationPermission | 'unsupported'
  setBrowserAlerts: (enabled: boolean) => Promise<void>
  connected: boolean
  loading: boolean
  error: string
  revision: number
  refresh: () => Promise<void>
}

export const ChatContext = createContext<ChatState | null>(null)

export function useChatStore() {
  const value = useContext(ChatContext)
  if (!value) throw new Error('useChatStore requires ChatStoreProvider')
  return value
}
