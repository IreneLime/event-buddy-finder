import { notificationHref } from '../lib/notification-display'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Bell, CalendarDays } from 'lucide-react'
import type { NotificationItem } from '@event-buddy/contracts'
import { chatError } from '../lib/chat-api'
import { useChatStore } from '../state/chat-context'
import { Button } from './ui/button'

export function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const { notifications, unreadCount: unread, markNotificationRead, loading, error: loadError, refresh } = useChatStore()
  const navigate = useNavigate()

  async function select(notification: NotificationItem) {
    try {
      await markNotificationRead(notification.id)
      setOpen(false)
      navigate(notificationHref(notification))
    } catch (error) { setError(chatError(error)) }
  }

  return <div className="relative">
    <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open} onClick={() => setOpen((value) => !value)}><Bell size={18} />{unread > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-brand-600 px-1 text-[9px] font-bold text-slate-950">{unread > 99 ? '99+' : unread}</span>}</Button>
    {open && <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3"><p className="text-sm font-bold">Notifications</p><span className="text-xs text-rose-700">{unread} unread</span></div>
      {(error || loadError) && <div role="alert" className="p-3 text-xs text-rose-700">{error || loadError}<Button variant="ghost" size="sm" onClick={() => void refresh()}>Retry</Button></div>}
      {loading && <p role="status" className="p-5 text-sm text-stone-500">Loading notifications…</p>}
      <div className="max-h-80 overflow-y-auto p-2">{notifications.map((notification) => <button key={notification.id} onClick={() => void select(notification)} className={`flex w-full gap-3 rounded-xl p-3 text-left hover:bg-stone-50 ${notification.readAt ? '' : 'bg-rose-50/50'}`}><CalendarDays size={18} className="mt-1 shrink-0 text-rose-600" /><span><span className="block text-xs font-semibold leading-5">{notification.message}</span><span className="mt-1 block text-[10px] text-stone-400">{new Date(notification.createdAt).toLocaleString()}</span></span></button>)}</div>
      {!loading && !loadError && notifications.length === 0 && <p className="p-5 text-center text-sm text-stone-500">You're all caught up.</p>}
      <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-stone-100 p-3 text-center text-xs font-bold text-brand-700 hover:bg-brand-50">View all notifications & settings</Link>
    </div>}
  </div>
}
