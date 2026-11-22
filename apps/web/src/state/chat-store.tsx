import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { ConversationSummary, NotificationItem } from '@event-buddy/contracts'
import { chatError, createChatApi, createChatSocket } from '../lib/chat-api'
import { ChatContext } from './chat-context'
import { useAuth } from './auth-store'
import { useEventStore } from './event-store'

function mergeAlerts(current: NotificationItem[], incoming: NotificationItem[]) {
  return [...new Map([...current, ...incoming].map((item) => [item.id, item])).values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id, undefined, { numeric: true }))
}

function browserPermission() { return typeof Notification === 'undefined' ? 'unsupported' as const : Notification.permission }

export function ChatStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return <ChatSession key={user?.id ?? 'signed-out'} userId={user?.id}>{children}</ChatSession>
}

function ChatSession({ userId, children }: { userId: string | undefined; children: ReactNode }) {
  const { events, refresh: refreshEvents } = useEventStore()
  const [chatApi] = useState(() => createChatApi(userId))
  const [socket] = useState(() => createChatSocket(userId))
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [nextNotificationCursor, setNextNotificationCursor] = useState<string>()
  const [liveAlerts, setLiveAlerts] = useState<NotificationItem[]>([])
  const [permission, setPermission] = useState(browserPermission)
  const preferenceKey = `event-buddy-browser-alerts:${userId ?? ''}`
  const [browserAlertsEnabled, setBrowserAlertsEnabled] = useState(() => {
    try { return browserPermission() === 'granted' && window.localStorage.getItem(preferenceKey) === 'true' }
    catch { return false }
  })
  const browserAlerts = useRef(browserAlertsEnabled)
  browserAlerts.current = browserAlertsEnabled
  const seenAlerts = useRef(new Set<string>())
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const generation = useRef(0)

  const refresh = useCallback(async () => {
    if (!userId) return
    const request = ++generation.current
    try {
      const [chats, inbox] = await Promise.all([chatApi.ListGroupChats(), chatApi.notifications()])
      if (request !== generation.current) return
      setConversations(chats.items)
      setNotifications(inbox.items)
      for (const item of inbox.items) seenAlerts.current.add(item.id)
      setUnreadCount(inbox.unreadCount)
      setNextNotificationCursor(inbox.nextCursor)
      setError('')
    } catch (error) { if (request === generation.current) setError(chatError(error)) }
    finally { if (request === generation.current) setLoading(false) }
  }, [chatApi, userId])

  // RSVP/event changes from the events API invalidate chat membership as well.
  useEffect(() => {
    if (!userId) return
    setRevision((value) => value + 1)
    void refresh()
  }, [events, refresh, userId])

  async function markNotificationRead(id: string) {
    const updated = await chatApi.readNotification(id)
    setNotifications((current) => mergeAlerts(current, [updated]))
    await refresh()
  }

  async function markAllNotificationsRead() {
    await chatApi.readAllNotifications()
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })))
    setUnreadCount(0)
    await refresh()
  }

  async function loadMoreNotifications() {
    if (!nextNotificationCursor) return
    const page = await chatApi.notifications(nextNotificationCursor)
    setNotifications((current) => mergeAlerts(current, page.items))
    for (const item of page.items) seenAlerts.current.add(item.id)
    setNextNotificationCursor(page.nextCursor)
    setUnreadCount(page.unreadCount)
  }

  async function setBrowserAlerts(enabled: boolean) {
    const result = enabled && browserPermission() !== 'unsupported' ? await Notification.requestPermission() : browserPermission()
    setPermission(result)
    const allowed = enabled && result === 'granted'
    setBrowserAlertsEnabled(allowed)
    try { window.localStorage.setItem(preferenceKey, String(allowed)) } catch { /* Preference remains available in this tab. */ }
  }

  useEffect(() => {
    if (!userId) return
    const connect = () => { setConnected(true); setRevision((value) => value + 1); void refresh() }
    const disconnect = () => setConnected(false)
    const failure = (error: Error) => { setConnected(false); setError(chatError(error)); setLoading(false) }
    const changed = () => { setRevision((value) => value + 1); void refresh() }
    const message = () => { void refresh() }
    const notificationCreated = (notification: NotificationItem) => {
      if (!seenAlerts.current.has(notification.id)) {
        seenAlerts.current.add(notification.id)
        setNotifications((current) => mergeAlerts(current, [notification]))
        setLiveAlerts((current) => [...current, notification].slice(-3))
        if (!notification.readAt) setUnreadCount((count) => count + 1)
        if (browserAlerts.current && browserPermission() === 'granted') {
          try {
            const alert = new Notification(notification.kind === 'event_cancelled' ? 'Event cancelled' : 'Event updated', { body: notification.message, tag: notification.id })
            alert.onclick = () => { window.focus(); window.location.assign(`/events/${encodeURIComponent(notification.eventId)}`); alert.close() }
          } catch { /* The saved in-app alert still works if the browser rejects desktop notifications. */ }
        }
      }
      void refresh()
      void refreshEvents()
    }
    socket.on('connect', connect).on('disconnect', disconnect).on('connect_error', failure)
    socket.on('conversations:changed', changed).on('message:created', message)
    socket.on('notification:created', notificationCreated).on('notifications:changed', message)
    socket.connect()
    return () => {
      generation.current += 1
      socket.off('connect', connect).off('disconnect', disconnect).off('connect_error', failure)
      socket.off('conversations:changed', changed).off('message:created', message)
      socket.off('notification:created', notificationCreated).off('notifications:changed', message)
      socket.disconnect()
    }
  }, [refresh, refreshEvents, socket, userId])

  return <ChatContext.Provider value={{ userId, api: chatApi, socket, conversations, notifications, unreadCount,
    nextNotificationCursor, liveAlerts, dismissAlert: (id) => setLiveAlerts((current) => current.filter((item) => item.id !== id)),
    markNotificationRead, markAllNotificationsRead, loadMoreNotifications, browserAlertsEnabled,
    browserPermission: permission, setBrowserAlerts, connected, loading, error, revision, refresh }}>{children}</ChatContext.Provider>
}
