import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { createChatServer } from '../../../services/chat-api/src/app'
import { createDemoStore } from '../../../services/chat-api/src/seed'
import type { ChatState } from '../src/state/chat-context'

const refreshEvents = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('../src/state/event-store', () => ({ useEventStore: () => ({ refresh: refreshEvents }) }))

const server = createChatServer({ devMode: true })
let origin: string
let auth: typeof import('../src/state/auth-store')
let chat: typeof import('../src/state/chat-store')
let context: typeof import('../src/state/chat-context')
let page: typeof import('../src/pages/notifications-page')
let menu: typeof import('../src/components/notifications-menu')
let toast: typeof import('../src/components/event-notification-toast')
let session: ChatState
const desktopAlert = vi.fn()

class FakeNotification {
  static permission: NotificationPermission = 'default'
  static requestPermission = vi.fn(async () => { FakeNotification.permission = 'granted'; return 'granted' as const })
  onclick: (() => void) | null = null
  constructor(title: string, options: NotificationOptions) { desktopAlert(title, options) }
  close() {}
}

beforeAll(async () => {
  await new Promise<void>((resolve) => server.httpServer.listen(0, '127.0.0.1', resolve))
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Test server failed to start')
  origin = `http://127.0.0.1:${address.port}`
  vi.stubEnv('VITE_CHAT_API_URL', origin)
  auth = await import('../src/state/auth-store')
  chat = await import('../src/state/chat-store')
  context = await import('../src/state/chat-context')
  page = await import('../src/pages/notifications-page')
  menu = await import('../src/components/notifications-menu')
  toast = await import('../src/components/event-notification-toast')
})

beforeEach(() => {
  window.localStorage.clear()
  window.localStorage.setItem('event-buddy-demo-user', 'cathy')
  server.service.store = createDemoStore()
  refreshEvents.mockClear()
  desktopAlert.mockClear()
  FakeNotification.permission = 'default'
  FakeNotification.requestPermission.mockClear()
  vi.stubGlobal('Notification', FakeNotification)
})

afterEach(async () => {
  cleanup()
  await waitFor(() => expect(server.io.sockets.sockets.size).toBe(0))
  vi.unstubAllGlobals()
})

afterAll(async () => {
  vi.unstubAllEnvs()
  await server.close()
})

function Controls() {
  const { signIn } = auth.useAuth()
  return <button onClick={() => signIn('mina@example.test', '123')}>Switch to Mina</button>
}
function Probe() { session = context.useChatStore(); return null }
function EventTarget() { return <h1>Event {useParams().eventId} opened</h1> }

async function mount() {
  const { AuthProvider } = auth
  const { ChatStoreProvider } = chat
  const { NotificationsPage } = page
  const { NotificationsMenu } = menu
  const { EventNotificationToast } = toast
  render(<AuthProvider><Controls /><MemoryRouter initialEntries={['/notifications']}><ChatStoreProvider>
    <Probe /><NotificationsMenu /><EventNotificationToast /><Routes>
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/events/:eventId" element={<EventTarget />} />
    </Routes>
  </ChatStoreProvider></MemoryRouter></AuthProvider>)
  await waitFor(() => { expect(session.connected).toBe(true); expect(session.loading).toBe(false) })
}

async function update(title: string, kind = 'event_updated') {
  await act(async () => {
    const response = await fetch(`${origin}/UpdateGroupChat/chat-night-market`, {
      method: 'PATCH', headers: { 'x-demo-user-id': 'mina', 'Content-Type': 'application/json' }, body: JSON.stringify({ title, kind }),
    })
    expect(response.status).toBe(200)
  })
  return server.service.inbox('cathy')[0]
}

it('shows live alerts and unread counts, refreshes event details, and deduplicates repeat delivery', async () => {
  await mount()
  const alert = await update('New venue for the market')
  const live = screen.getByRole('region', { name: 'Live event alerts' })
  await within(live).findByText(alert.message)
  await screen.findByRole('button', { name: 'Notifications, 1 unread' })
  expect(refreshEvents).toHaveBeenCalled()
  expect(FakeNotification.requestPermission).not.toHaveBeenCalled()
  expect(desktopAlert).not.toHaveBeenCalled()
  await act(async () => { server.io.to('user:cathy').emit('notification:created', alert) })
  expect(within(live).getAllByText(alert.message)).toHaveLength(1)
  expect(session.unreadCount).toBe(1)

  fireEvent.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }))
  fireEvent.click(screen.getByRole('link', { name: 'View all notifications & settings' }))
  expect(screen.getByRole('heading', { name: 'Notifications', level: 1 })).toBeTruthy()
})

it('opens and marks a notification read, including updates created while the user was offline', async () => {
  const alert = await update('Offline update for Cathy')
  await mount()
  expect(session.unreadCount).toBe(1)
  expect(session.liveAlerts).toEqual([])
  const row = screen.getByRole('button', { name: new RegExp(alert.message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
  fireEvent.click(row)
  await screen.findByRole('heading', { name: 'Event night-market opened' })
  expect(server.service.inbox('cathy')[0].readAt).toBeTruthy()
  await waitFor(() => expect(session.unreadCount).toBe(0))
})

it('supports unread filtering and mark-all-read, and clears Cathy alerts when switching to Mina', async () => {
  await update('An earlier update')
  await mount()
  await update('Cancelled market', 'event_cancelled')
  await waitFor(() => expect(session.unreadCount).toBe(2))
  fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }))
  await waitFor(() => expect(session.unreadCount).toBe(0))
  expect(server.service.inbox('cathy').every((item) => item.readAt)).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Unread', exact: true }))
  expect(screen.getByText('No unread notifications.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Switch to Mina' }))
  await waitFor(() => { expect(session.userId).toBe('mina'); expect(session.loading).toBe(false) })
  expect(session.notifications).toEqual([])
  expect(session.liveAlerts).toEqual([])
})

it('requests browser permission only on an explicit click and keeps the preference per account', async () => {
  await mount()
  expect(FakeNotification.requestPermission).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Enable browser alerts' }))
  await screen.findByRole('button', { name: 'Disable browser alerts' })
  expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1)
  const alert = await update('Browser notification test')
  await waitFor(() => expect(desktopAlert).toHaveBeenCalledWith('Event updated', { body: alert.message, tag: alert.id }))
  expect(window.localStorage.getItem('event-buddy-browser-alerts:cathy')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: 'Switch to Mina' }))
  await screen.findByRole('button', { name: 'Enable browser alerts' })
  expect(session.browserAlertsEnabled).toBe(false)
})
