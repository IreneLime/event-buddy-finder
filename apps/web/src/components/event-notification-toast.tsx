import { Link } from 'react-router'
import { Bell, X } from 'lucide-react'
import { useChatStore } from '../state/chat-context'
import { Button } from './ui/button'

export function EventNotificationToast() {
  const { liveAlerts, dismissAlert } = useChatStore()
  return <div role="region" aria-label="Live event alerts" aria-live="polite" className="fixed bottom-24 right-4 z-50 flex w-[min(380px,calc(100vw-32px))] flex-col gap-3 md:bottom-6">
    {liveAlerts.map((alert) => <div role="status" key={alert.id} className="rounded-2xl border border-brand-200 bg-white p-4 shadow-xl">
      <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-sm font-bold"><Bell size={16} className="text-brand-700" />{alert.kind === 'event_cancelled' ? 'Event cancelled' : 'Event updated'}</p><Button variant="ghost" size="icon" aria-label="Dismiss event alert" onClick={() => dismissAlert(alert.id)}><X size={16} /></Button></div>
      <p className="mt-2 text-sm leading-6 text-stone-600">{alert.message}</p>
      <Link to={`/events/${alert.eventId}`} onClick={() => dismissAlert(alert.id)} className="mt-3 inline-block text-xs font-bold text-brand-700 underline">View event</Link>
    </div>)}
  </div>
}
