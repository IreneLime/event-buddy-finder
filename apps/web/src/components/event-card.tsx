import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight, CalendarDays, Heart, MapPin, Users } from 'lucide-react'
import type { EventSummary } from '@event-buddy/contracts'
import { formatEventDate } from '../lib/utils'
import { getEventArtwork, getEventEmoji } from '../data/mock-events'
import { ApiImage } from './api-image'
import { Avatar } from './ui/avatar'
import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { useEventStore } from '../state/event-store'
import { useAuth } from '../state/auth-store'

export function EventCard({ event, readOnly = false, showCount = true }: { event: EventSummary; readOnly?: boolean; showCount?: boolean }) {
  const [saved, setSaved] = useState(false)
  const { user, live: liveAuth } = useAuth()
  const { live } = useEventStore()
  const target = '/events/' + encodeURIComponent(event.id)
  const art = <div className={'event-art ' + getEventArtwork(event.categoryNames) + ' relative flex h-44 items-center justify-center overflow-hidden'}>
      <div className="absolute left-4 top-4 z-[2] flex gap-2">
        {event.categoryNames.slice(0, 2).map((category) => <Badge key={category} className="border border-white/50 bg-white/85 text-stone-700 backdrop-blur">{category}</Badge>)}
      </div>
      <div className="event-art-orbit" aria-hidden="true" />
      <ApiImage kind="event" id={live || readOnly ? event.id : undefined} className="absolute inset-0 size-full object-cover" fallback={<span className="event-art-emoji" aria-hidden="true">{getEventEmoji(event.categoryNames)}</span>} />
      <span className="absolute bottom-4 right-4 z-[2] rounded-xl bg-white/85 px-3 py-1.5 text-sm font-bold text-stone-800 shadow-sm backdrop-blur">{event.priceAmount ? `$${event.priceAmount}` : 'Free'}</span>
    </div>
  return <Card className="group overflow-hidden transition duration-200 hover:-translate-y-0.5">
    {readOnly ? art : <Link to={target} aria-label={'View ' + event.title} className="block">{art}</Link>}
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div><p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-brand-700"><CalendarDays size={14} />{formatEventDate(event.startsAt)}</p>{readOnly ? <h3 className="text-lg font-bold">{event.title}</h3> : <Link to={target} className="text-lg font-bold leading-snug tracking-tight text-stone-900 hover:text-brand-700">{event.title}</Link>}</div>
        {!live && !liveAuth && !readOnly && (user ? <button type="button" aria-label={saved ? `Remove ${event.title} from saved events` : `Save ${event.title}`} aria-pressed={saved} className={`-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-xl transition hover:bg-brand-50 ${saved ? 'text-brand-600' : 'text-stone-400'}`} onClick={() => setSaved((value) => !value)}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /></button> : <Link to="/login" aria-label={`Sign in to save ${event.title}`} title="Sign in to save events" className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-xl text-stone-400 transition hover:bg-brand-50 hover:text-brand-700"><Heart size={17} /></Link>)}
      </div>
      <p className="mt-2 line-clamp-2 min-h-[48px] text-[15px] leading-6 text-stone-600">{event.description}</p>
      <div className="mt-4 space-y-2 text-sm leading-5 text-stone-600"><p className="flex items-center gap-2"><MapPin size={15} className="shrink-0 text-stone-400" />{event.locationName}{event.city ? ` · ${event.city}` : ''}</p>{showCount && <p className="flex items-center gap-2"><Users size={15} className="shrink-0 text-stone-400" />{event.participantCount} people interested or going</p>}</div>
      <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4"><div className="flex items-center gap-2"><Avatar name={event.organizerName} className="size-7 text-[10px]" /><span className="text-sm font-medium text-stone-600">{event.organizerName}</span></div>{!readOnly && <Link to={target} className="flex items-center gap-1 text-sm font-semibold text-brand-700">Details <ArrowUpRight size={14} /></Link>}</div>
    </div>
  </Card>
}
