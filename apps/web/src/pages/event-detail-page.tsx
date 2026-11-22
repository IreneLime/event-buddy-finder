import { lazy, Suspense, useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, CalendarDays, Check, Clock3, Heart, MapPin, MessageCircle, Pencil, Share2, Users } from 'lucide-react'
import { getEventArtwork, getEventEmoji } from '../data/mock-events'
import { useEventDetails, useEventStore } from '../state/event-store'
import type { EventSummary } from '@event-buddy/contracts'
import { ApiImage } from '../components/api-image'
import { errorMessage, eventApi } from '../lib/backend-api'
import { useApiResource } from '../lib/use-api-resource'
import { useAuth } from '../state/auth-store'
import { demoUsers } from '../data/demo-users'

const EventMapPreview = lazy(() => import('../components/events-map').then(({ EventMapPreview: Component }) => ({ default: Component })))
import { formatEventDate } from '../lib/utils'
import { Avatar } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

export function EventDetailPage() {
  const { eventId = '' } = useParams()
  const { user } = useAuth()
  const { event, loading, error, retry } = useEventDetails(eventId)
  if (loading) return <p role="status" className="p-8">Loading event…</p>
  if (error) return <div role="alert" className="p-8">{error} <Button onClick={retry}>Try again</Button></div>
  if (!event) return <div className="mx-auto max-w-xl py-20 text-center"><p className="text-lg font-bold">We couldn't find that event.</p><Button asChild variant="secondary" className="mt-5"><Link to="/events"><ArrowLeft size={15} />Back to events</Link></Button></div>
  return <EventDetails key={event.id + ':' + (user?.id ?? '')} loadedEvent={event} />
}

function EventDetails({ loadedEvent }: { loadedEvent: EventSummary }) {
  const navigate = useNavigate()
  const { user, live: liveAuth } = useAuth()
  const { live, setParticipation, cancelEvent, canEdit } = useEventStore()
  const [updatedEvent, setUpdatedEvent] = useState<EventSummary>()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const event = updatedEvent ?? loadedEvent
  const eventId = event.id
  const loadMembers = useCallback((signal: AbortSignal) => eventApi.participants(eventId, signal), [eventId])
  const members = useApiResource(live ? loadMembers : null)
  const canChat = event.status !== 'cancelled' && Boolean(user) && ((canEdit(event) && event.viewerParticipation !== 'withdrawn') || event.viewerParticipation === 'interested' || event.viewerParticipation === 'going')
  const canRespond = Boolean(user && event.status !== 'cancelled' && (live ? liveAuth ? user.emailVerified : import.meta.env.DEV : !liveAuth))

  async function chooseParticipation(status: 'interested' | 'going' | undefined) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      setUpdatedEvent(await setParticipation(event.id, status))
      setMessage(status ? (status === 'going' ? 'You’re going.' : 'Marked as interested.') : 'Your RSVP was cleared.')
      if (live) members.retry()
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }

  async function cancel() {
    setBusy(true)
    setError('')
    try {
      setUpdatedEvent(await cancelEvent(event.id))
      setConfirmCancel(false)
      setMessage('Event cancelled.')
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }

  return <div className="space-y-6">
    <div className="flex items-center justify-between">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft size={15} />Back</Button>
      <div className="flex gap-2"><Button variant="outline" size="sm"><Share2 size={15} /><span className="hidden sm:inline">Share</span></Button>{canEdit(event) && event.status !== 'cancelled' && <Button asChild variant="outline" size="sm"><Link to={`/events/${event.id}/edit`}><Pencil size={15} />Edit event</Link></Button>}</div>
    </div>

    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_350px]">
      <div className="space-y-6">
        <div className={`event-art ${getEventArtwork(event.categoryNames)} relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-[28px] sm:min-h-[360px]`}>
          <div className="event-art-orbit" aria-hidden="true" /><ApiImage kind="event" id={live ? event.id : undefined} className="absolute inset-0 size-full object-cover" fallback={<span className="event-art-emoji event-art-emoji-lg" aria-hidden="true">{getEventEmoji(event.categoryNames)}</span>} />
          <Badge className="absolute left-5 top-5 z-[2] border border-white/60 bg-white/90 text-stone-700">{event.status === 'scheduled' ? 'Happening soon' : 'Cancelled'}</Badge>
        </div>
        <section>
          <div className="flex flex-wrap gap-2">{event.categoryNames.map((category) => <Badge key={category} className="bg-brand-50 text-brand-700">{category}</Badge>)}</div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">{event.title}</h1>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-500">
            <span className="flex items-center gap-2"><CalendarDays size={16} className="text-brand-600" />{formatEventDate(event.startsAt)}</span>
            <span className="flex items-center gap-2"><MapPin size={16} className="text-brand-600" />{event.locationName}{event.city ? ` · ${event.city}` : ''}</span>
          </div>
        </section>
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-bold text-stone-900">About this event</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-600">{event.description}</p>
          {event.notes && <div className="mt-5 rounded-2xl bg-brand-50/70 p-4 sm:p-5"><h3 className="text-sm font-bold text-stone-800">Where to meet & what to know</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-stone-600">{event.notes}</p></div>}
        </Card>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-5 sm:p-6"><div><h2 className="text-base font-bold text-stone-900">Where to meet</h2><p className="mt-1 text-sm text-stone-500">{event.address ?? event.locationName}</p></div><MapPin className="text-brand-600" size={20} /></div>
          <div className="border-t border-stone-100"><Suspense fallback={<div className="grid h-[300px] place-items-center bg-brand-50 text-sm text-stone-500">Loading map…</div>}><EventMapPreview event={event} /></Suspense><p className="px-5 py-2 text-[10px] text-stone-400">Map data © <a className="underline hover:text-brand-700" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></p></div>
        </Card>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between"><p className="text-sm font-semibold text-stone-800">Your plan</p><span className="text-xs text-stone-400">Change anytime</span></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant={event.viewerParticipation === 'interested' ? 'primary' : 'outline'} className="h-12" aria-pressed={event.viewerParticipation === 'interested'} disabled={!canRespond || busy} onClick={() => void chooseParticipation(event.viewerParticipation === 'interested' ? undefined : 'interested')}><Heart size={16} fill={event.viewerParticipation === 'interested' ? 'currentColor' : 'none'} />Interested</Button>
            <Button variant={event.viewerParticipation === 'going' ? 'dark' : 'outline'} className="h-12" aria-pressed={event.viewerParticipation === 'going'} disabled={!canRespond || busy} onClick={() => void chooseParticipation(event.viewerParticipation === 'going' ? undefined : 'going')}><Check size={16} />Going</Button>
          </div>
          {!user && <Button asChild variant="secondary" className="mt-4 w-full"><Link to="/login" state={{ from: '/events/' + event.id }}>Sign in to join this event</Link></Button>}
          {liveAuth && user && !user.emailVerified && <p className="mt-3 text-sm"><Link className="underline" to="/profile/edit">Verify your email</Link> before changing your RSVP.</p>}
          {user && !canChat && event.status === 'scheduled' && <p className="mt-3 text-xs text-stone-600">Choose Interested or Going to open the event chat.</p>}
          {canChat && <Button asChild className="mt-5 w-full" variant="secondary"><Link to={'/chats/event/' + encodeURIComponent(event.id)}><MessageCircle size={16} />Open event chat</Link></Button>}
          {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error} {liveAuth && <Link to="/profile" className="underline">My profile</Link>}</p>}
          {event.status === 'cancelled' && <p role="status" className="mt-3 text-sm">This event has been cancelled.</p>}
          {message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
        </Card>

        {live && canEdit(event) && event.status !== 'cancelled' && <Card className="space-y-3 p-5">
          {confirmCancel ? <><p>Cancel this event?</p><div className="flex gap-2"><Button disabled={busy} onClick={() => void cancel()}>Confirm cancellation</Button><Button variant="outline" disabled={busy} onClick={() => setConfirmCancel(false)}>Keep event</Button></div></>
            : <Button variant="outline" onClick={() => setConfirmCancel(true)}>Cancel event</Button>}
        </Card>}
        <Card className="space-y-3 p-5">
          <div className="flex justify-between"><h2 className="text-sm font-semibold">The group</h2>{!live && !liveAuth && <Link to="/chats" className="text-xs font-semibold text-brand-700">See chat</Link>}</div>
          {!live && !liveAuth && <div className="flex items-center gap-2">{demoUsers.filter((person) => person.displayName !== event.organizerName).slice(0, 3).map((person) =>
            <Link key={person.id} to={'/profile/' + person.id} aria-label={'View ' + person.displayName + '’s profile'}><Avatar name={person.displayName} /></Link>)}</div>}
          <p className="flex items-center gap-2 text-xs text-stone-500"><Users size={14} />{members.data?.total ?? event.participantCount} people interested or going</p>
          {members.data && <div className="flex flex-wrap gap-2">{members.data.items.map((person) =>
            <Link key={person.userId} to={'/profile/' + encodeURIComponent(person.userId)} title={person.displayName}><Avatar name={person.displayName} /></Link>)}</div>}
          <div className="flex items-center gap-3 border-t border-stone-100 pt-3"><Avatar name={event.organizerName} />
            <div><p className="text-xs font-bold">{event.organizerName}</p><p className="text-[11px] text-stone-500">Event organizer</p></div>
            {live && event.organizerUserId && <Button asChild variant="ghost" size="sm"><Link to={'/profile/' + encodeURIComponent(event.organizerUserId)}>View profile</Link></Button>}
            {!live && demoUsers.some((person) => person.displayName === event.organizerName) && <Button asChild variant="ghost" size="sm"><Link to={'/profile/' + demoUsers.find((person) => person.displayName === event.organizerName)?.id}>View profile</Link></Button>}
          </div>
        </Card>
        <p className="flex items-center justify-center gap-1.5 text-xs text-stone-400"><Clock3 size={13} />Posted recently · Updated just now</p>
      </aside>
    </div>
  </div>
}
