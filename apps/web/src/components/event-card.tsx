import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight, CalendarDays, Heart, MapPin, Users } from 'lucide-react'
import type { EventSummary } from '@event-buddy/contracts'
import { formatEventDate } from '../lib/utils'
import { getEventArtwork, getEventEmoji } from '../data/mock-events'
import { Avatar } from './ui/avatar'
import { Badge } from './ui/badge'
import { Card } from './ui/card'

export function EventCard({ event }: { event: EventSummary }) {
  const [saved, setSaved] = useState(false)
  return <Card className="group overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(41,37,36,0.1)]">
    <Link to={`/events/${event.id}`} aria-label={`View ${event.title}`} className={`event-art ${getEventArtwork(event.categoryNames)} relative flex h-44 items-center justify-center overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-rose-200`}>
      <div className="absolute left-4 top-4 flex gap-2">
        {event.categoryNames.slice(0, 2).map((category) => <Badge key={category} className="border border-white/50 bg-white/85 text-stone-700 backdrop-blur">{category}</Badge>)}
      </div>
      <div className="event-art-orbit" aria-hidden="true" />
      <span className="event-art-emoji" aria-hidden="true">{getEventEmoji(event.categoryNames)}</span>
      <span className="absolute bottom-4 right-4 rounded-xl bg-white/85 px-3 py-1.5 text-xs font-bold text-stone-800 shadow-sm backdrop-blur">{event.priceAmount ? `$${event.priceAmount}` : 'Free'}</span>
    </Link>
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div><p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-rose-700"><CalendarDays size={13} />{formatEventDate(event.startsAt)}</p><Link to={`/events/${event.id}`} className="text-lg font-bold leading-snug tracking-tight text-stone-900 transition hover:text-rose-700">{event.title}</Link></div>
        <button type="button" aria-label={saved ? `Remove ${event.title} from saved events` : `Save ${event.title}`} aria-pressed={saved} className={`-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-xl transition hover:bg-rose-50 ${saved ? 'text-rose-600' : 'text-stone-400'}`} onClick={() => setSaved((value) => !value)}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>
      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-relaxed text-stone-500">{event.description}</p>
      <div className="mt-4 space-y-2 text-xs text-stone-500"><p className="flex items-center gap-2"><MapPin size={14} className="text-stone-400" />{event.locationName}</p><p className="flex items-center gap-2"><Users size={14} className="text-stone-400" />{event.participantCount} people going or interested</p></div>
      <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4"><div className="flex items-center gap-2"><Avatar name={event.organizerName} className="size-7 text-[10px]" /><span className="text-xs font-medium text-stone-600">{event.organizerName}</span></div><Link to={`/events/${event.id}`} className="flex items-center gap-1 text-xs font-semibold text-rose-700">Details <ArrowUpRight size={14} /></Link></div>
    </div>
  </Card>
}
