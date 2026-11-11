import { useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, ChevronDown, MapPin, Search, SlidersHorizontal, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router'
import { eventCategories } from '../data/mock-events'
import { useEventStore } from '../state/event-store'
import { EventCard } from '../components/event-card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export function EventsPage() {
  const { events } = useEventStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All events')
  const visibleEvents = useMemo(() => events.filter((event) => {
    const matchesCategory = category === 'All events' || event.categoryNames.includes(category)
    const searchable = `${event.title} ${event.description} ${event.locationName} ${event.categoryNames.join(' ')}`.toLowerCase()
    return matchesCategory && searchable.includes(query.toLowerCase()) && event.status === 'scheduled'
  }), [category, events, query])

  return <div className="space-y-8">
    <section className="relative overflow-hidden rounded-[28px] bg-[#2c3025] px-6 py-8 text-white sm:px-9 sm:py-10 lg:px-12 lg:py-12">
      <div className="hero-glow hero-glow-one" aria-hidden="true" />
      <div className="hero-glow hero-glow-two" aria-hidden="true" />
      <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_280px] lg:items-end">
        <div className="max-w-2xl">
          <Badge className="border border-white/15 bg-white/10 text-rose-100"><Sparkles size={12} className="mr-1" />A little more together</Badge>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.07] tracking-[-0.04em] sm:text-5xl">Good plans are better with a <span className="text-[#f7ad98]">plus-one.</span></h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-stone-300 sm:text-base">Find something happening nearby, meet people who are into it, and make a day of it.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="primary"><a href="#discover">Explore events <ArrowRight size={16} /></a></Button>
            <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link to="/events/new">Host something</Link></Button>
          </div>
        </div>
        <div className="hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm lg:block">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#f7ad98]/15 text-[#ffc7b8]"><Users size={19} /></span><div><p className="text-2xl font-bold">{events.reduce((sum, event) => sum + event.participantCount, 0)}</p><p className="text-xs text-stone-300">people finding their people</p></div></div>
          <div className="mt-5 flex items-center gap-2 text-xs text-stone-300"><MapPin size={14} className="text-[#ffc7b8]" />Across the Greater Toronto Area</div>
        </div>
      </div>
    </section>

    <section id="discover" className="space-y-6 scroll-mt-28">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-rose-700">The community calendar</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">Find your next thing</h2><p className="mt-1.5 text-sm text-stone-500">Little plans, new friends, good stories.</p></div>
        <Button variant="outline" size="sm" className="self-start sm:self-auto"><CalendarDays size={15} />Calendar view <ChevronDown size={14} /></Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="relative block flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><Input aria-label="Search events" placeholder="Search events, places, or interests…" className="h-12 pl-10" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <Button variant="outline" className="h-12 justify-start text-stone-600"><MapPin size={16} className="text-rose-600" />Toronto, ON <ChevronDown size={14} className="ml-auto" /></Button>
        <Button variant="outline" className="h-12"><SlidersHorizontal size={16} />More filters</Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {eventCategories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${category === item ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'}`}>{item}</button>)}
      </div>

      <div className="flex items-center justify-between"><p className="text-sm text-stone-500"><span className="font-semibold text-stone-800">{visibleEvents.length} events</span> coming up</p><button className="text-xs font-semibold text-rose-700 hover:text-rose-800">Sort: Recommended <ChevronDown size={13} className="ml-1 inline" /></button></div>
      {visibleEvents.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{visibleEvents.map((event) => <EventCard event={event} key={event.id} />)}</div> : <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center"><p className="font-semibold text-stone-800">No events match that search.</p><p className="mt-1 text-sm text-stone-500">Try another keyword or category.</p></div>}
    </section>
  </div>
}
