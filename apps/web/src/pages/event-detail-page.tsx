import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, CalendarDays, Check, Clock3, Heart, MapPin, MessageCircle, Pencil, Share2, Users } from 'lucide-react'
import { getEventArtwork, getEventEmoji } from '../data/mock-events'
import { useEventStore } from '../state/event-store'
import { formatEventDate } from '../lib/utils'
import { Avatar } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

export function EventDetailPage() {
  const { eventId = '' } = useParams()
  const navigate = useNavigate()
  const { getEvent, setParticipation } = useEventStore()
  const event = getEvent(eventId)
  const [toast, setToast] = useState('')

  if (!event) return <div className="mx-auto max-w-xl py-20 text-center"><p className="text-lg font-bold">We couldn't find that event.</p><Button asChild variant="secondary" className="mt-5"><Link to="/events"><ArrowLeft size={15} />Back to events</Link></Button></div>

  const canChat = event.viewerParticipation === 'interested' || event.viewerParticipation === 'going'
  const chooseParticipation = (status: 'interested' | 'going' | undefined) => {
    setParticipation(event.id, status)
    setToast(status ? `You're marked ${status} for this event.` : 'Your event status has been cleared.')
    window.setTimeout(() => setToast(''), 2400)
  }

  return <div className="space-y-6">
    <div className="flex items-center justify-between">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft size={15} />Back</Button>
      <div className="flex gap-2"><Button variant="outline" size="sm"><Share2 size={15} /><span className="hidden sm:inline">Share</span></Button><Button asChild variant="outline" size="sm"><Link to={`/events/${event.id}/edit`}><Pencil size={15} />Edit event</Link></Button></div>
    </div>

    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_350px]">
      <div className="space-y-6">
        <div className={`event-art ${getEventArtwork(event.categoryNames)} relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-[28px] sm:min-h-[360px]`}>
          <div className="event-art-orbit" aria-hidden="true" /><span className="event-art-emoji event-art-emoji-lg" aria-hidden="true">{getEventEmoji(event.categoryNames)}</span>
          <Badge className="absolute left-5 top-5 border border-white/60 bg-white/90 text-stone-700">{event.status === 'scheduled' ? 'Happening soon' : 'Cancelled'}</Badge>
        </div>
        <section>
          <div className="flex flex-wrap gap-2">{event.categoryNames.map((category) => <Badge key={category} className="bg-rose-50 text-rose-700">{category}</Badge>)}</div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">{event.title}</h1>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-500">
            <span className="flex items-center gap-2"><CalendarDays size={16} className="text-rose-600" />{formatEventDate(event.startsAt)}</span>
            <span className="flex items-center gap-2"><MapPin size={16} className="text-rose-600" />{event.locationName}</span>
          </div>
        </section>
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-bold text-stone-900">About this event</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-600">{event.description}</p>
        </Card>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-5 sm:p-6"><div><h2 className="text-base font-bold text-stone-900">Where to meet</h2><p className="mt-1 text-sm text-stone-500">{event.address ?? event.locationName}</p></div><MapPin className="text-rose-600" size={20} /></div>
          <div className="map-placeholder relative grid h-48 place-items-center border-t border-stone-100"><span className="map-grid-lines" aria-hidden="true" /><span className="relative z-10 grid size-12 place-items-center rounded-full border-4 border-white bg-rose-600 text-white shadow-lg"><MapPin size={19} fill="currentColor" /></span><span className="absolute bottom-3 left-3 rounded-md bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-stone-500">Map preview · connect a map provider later</span></div>
        </Card>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between"><p className="text-sm font-semibold text-stone-800">Your plan</p><span className="text-xs text-stone-400">Change anytime</span></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant={event.viewerParticipation === 'interested' ? 'primary' : 'outline'} className="h-12" aria-pressed={event.viewerParticipation === 'interested'} onClick={() => chooseParticipation(event.viewerParticipation === 'interested' ? undefined : 'interested')}><Heart size={16} fill={event.viewerParticipation === 'interested' ? 'currentColor' : 'none'} />Interested</Button>
            <Button variant={event.viewerParticipation === 'going' ? 'dark' : 'outline'} className="h-12" aria-pressed={event.viewerParticipation === 'going'} onClick={() => chooseParticipation(event.viewerParticipation === 'going' ? undefined : 'going')}><Check size={16} />Going</Button>
          </div>
          <p className="mt-3 text-xs leading-5 text-stone-500">Mark yourself interested to join the event chat, or choose going if you plan to attend.</p>
          {canChat ? <Button asChild className="mt-5 w-full" variant="secondary"><Link to={`/chats/${event.id}`}><MessageCircle size={16} />Open event chat</Link></Button> : <Button className="mt-5 w-full" variant="outline" disabled><MessageCircle size={16} />Open event chat</Button>}
          {!canChat && <p className="mt-2 text-center text-[11px] text-stone-400">Choose Interested or Going to unlock chat</p>}
          {toast && <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{toast}</p>}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-stone-900">The group</h2><Link to="/chats" className="text-xs font-semibold text-rose-700">See chat</Link></div>
          <div className="mt-4 flex items-center -space-x-2"><Avatar name="Mina Park" className="size-9 border-2 border-white" /><Avatar name="Alex Rivera" className="size-9 border-2 border-white" /><Avatar name="Nadia Chen" className="size-9 border-2 border-white" /><span className="ml-3 text-xs text-stone-500">+{Math.max(0, event.participantCount - 3)} more</span></div>
          <p className="mt-3 flex items-center gap-2 text-xs text-stone-500"><Users size={14} />{event.participantCount} people interested or going</p>
          <div className="mt-4 flex items-center gap-3 border-t border-stone-100 pt-4"><Avatar name={event.organizerName} /><div><p className="text-xs font-bold text-stone-800">{event.organizerName}</p><p className="mt-0.5 text-[11px] text-stone-500">Event organizer</p></div></div>
        </Card>
        <p className="flex items-center justify-center gap-1.5 text-xs text-stone-400"><Clock3 size={13} />Posted recently · Updated just now</p>
      </aside>
    </div>
  </div>
}
