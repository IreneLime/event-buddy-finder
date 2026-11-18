import { useState } from 'react'
import { Bell, CalendarDays, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { NotificationItem } from '@event-buddy/contracts'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { SignInPrompt } from '../components/sign-in-prompt'
import { useAuth } from '../state/auth-store'
import { useChatStore } from '../state/chat-context'
import { chatError } from '../lib/chat-api'

export function NotificationsPage() {
  const { user } = useAuth()
  const { notifications, unreadCount, loading, error: loadError, refresh, connected, nextNotificationCursor,
    markNotificationRead, markAllNotificationsRead, loadMoreNotifications, browserAlertsEnabled, browserPermission, setBrowserAlerts } = useChatStore()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const navigate = useNavigate()
  if (!user) return <SignInPrompt title="Sign in to view notifications" description="Your saved event updates are available after you sign in." />

  async function action(work: () => Promise<void>) {
    setWorking(true)
    setError('')
    try { await work() } catch (error) { setError(chatError(error)) }
    finally { setWorking(false) }
  }
  async function open(notification: NotificationItem) {
    await action(async () => { await markNotificationRead(notification.id); navigate(`/events/${notification.eventId}`) })
  }
  const visible = notifications.filter((item) => !unreadOnly || !item.readAt)
  return <div className="mx-auto max-w-3xl space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-700">Keep your plans up to date</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-bold"><Bell size={27} />Notifications</h1><p className="mt-3 text-sm text-stone-500">{unreadCount} unread · {connected ? 'Live updates connected' : 'Reconnecting to live updates…'}</p></div>
    <Card className="flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="text-sm font-bold">Browser notifications</h2><p className="mt-1 text-xs text-stone-500">Get an alert while this app is open in another tab.</p>{browserPermission === 'denied' && <p className="mt-2 text-xs text-amber-800">Notifications are blocked in your browser settings. In-app alerts still work.</p>}</div><Button variant="outline" size="sm" disabled={working || browserPermission === 'unsupported' || browserPermission === 'denied'} onClick={() => void action(() => setBrowserAlerts(!browserAlertsEnabled))}>{browserPermission === 'unsupported' ? 'Unavailable in this browser' : browserAlertsEnabled ? 'Disable browser alerts' : 'Enable browser alerts'}</Button></Card>
    <div className="flex flex-wrap items-center justify-between gap-3"><div role="group" aria-label="Filter notifications" className="flex gap-2"><Button size="sm" variant={!unreadOnly ? 'primary' : 'outline'} aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>All</Button><Button size="sm" variant={unreadOnly ? 'primary' : 'outline'} aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Unread</Button></div><Button variant="ghost" size="sm" disabled={!unreadCount || working} onClick={() => void action(markAllNotificationsRead)}><CheckCheck size={16} />Mark all as read</Button></div>
    {(error || loadError) && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error || loadError}<Button variant="ghost" size="sm" onClick={() => void refresh()}>Retry</Button></div>}
    <Card className="divide-y divide-stone-100 overflow-hidden">
      {loading && <p role="status" className="p-8 text-center text-stone-500">Loading notifications…</p>}
      {visible.map((notification) => <button key={notification.id} disabled={working} onClick={() => void open(notification)} className={`flex w-full items-start gap-3 p-5 text-left hover:bg-brand-50/60 ${notification.readAt ? '' : 'bg-brand-50/40'}`}><CalendarDays size={20} className={`mt-1 shrink-0 ${notification.kind === 'event_cancelled' ? 'text-rose-700' : 'text-brand-700'}`} /><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{notification.eventTitle ?? 'Event update'}</span><span className="mt-1 block text-sm leading-6 text-stone-600">{notification.message}</span><time dateTime={notification.createdAt} className="mt-2 block text-xs text-stone-400">{new Date(notification.createdAt).toLocaleString()}</time></span>{!notification.readAt && <span aria-label="Unread" className="mt-2 size-2 shrink-0 rounded-full bg-brand-600" />}</button>)}
      {!loading && !visible.length && <p className="p-10 text-center text-sm text-stone-500">{unreadOnly ? 'No unread notifications.' : 'No event updates yet. Mark an event Interested or Going to receive its updates.'}</p>}
    </Card>
    {nextNotificationCursor && <div className="text-center"><Button variant="outline" disabled={working} onClick={() => void action(loadMoreNotifications)}>Load earlier notifications</Button></div>}
  </div>
}
