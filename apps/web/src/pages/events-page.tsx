import { lazy, Suspense, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, ListFilter, MapPin, Search, SlidersHorizontal, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import type { EventSummary } from '@event-buddy/contracts'
import { eventCategories } from '../data/mock-events'
import { useEventStore } from '../state/event-store'
import { EventCard } from '../components/event-card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useExploreCity } from '../state/explore-city'

type ViewMode = 'cards' | 'calendar' | 'map'
type DateFilter = 'any' | 'week' | 'month'
type SortMode = 'soonest' | 'popular' | 'price'
const EventsMap = lazy(() => import('../components/events-map').then(({ EventsMap: Component }) => ({ default: Component })))

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
function sameDay(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate()
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
}

function CalendarView({ events, month, onMonthChange }: { events: EventSummary[]; month: Date; onMonthChange: (month: Date) => void }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => index - offset + 1)

  return <section aria-label={`${monthLabel(month)} event calendar`} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-stone-100 px-4 py-4 sm:px-6">
      <h3 className="text-lg font-bold text-stone-900">{monthLabel(month)}</h3>
      <div className="flex gap-1">
        <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={17} /></Button>
        <Button variant="outline" size="icon" aria-label="Next month" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={17} /></Button>
      </div>
    </div>
    <div className="grid grid-cols-7 border-b border-stone-100 bg-stone-50/70">{weekdays.map((day) => <div key={day} className="px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-stone-500 sm:py-3 sm:text-xs">{day}</div>)}</div>
    <div className="grid grid-cols-7">{cells.map((day, index) => {
      const valid = day > 0 && day <= days
      const date = valid ? new Date(month.getFullYear(), month.getMonth(), day) : undefined
      const dayEvents = date ? events.filter((event) => sameDay(new Date(event.startsAt), date)) : []
      return <div key={index} className={`min-h-[86px] border-b border-r border-stone-100 p-1.5 sm:min-h-[122px] sm:p-2 ${valid ? 'bg-white' : 'bg-stone-50/60'}`}>
        {valid && <><span className={`grid size-6 place-items-center rounded-full text-xs ${date && sameDay(date, new Date()) ? 'bg-brand-600 font-bold text-slate-950' : 'text-stone-500'}`}>{day}</span><div className="mt-1 space-y-1">{dayEvents.map((event) => <Link key={event.id} to={`/events/${event.id}`} title={`${formatTime(event.startsAt)} · ${event.title}`} className="block truncate rounded-md bg-brand-50 px-1.5 py-1 text-[10px] font-semibold text-brand-800 transition hover:bg-brand-100 sm:text-xs"><span className="hidden sm:inline">{formatTime(event.startsAt)} · </span>{event.title}</Link>)}</div></>}
      </div>
    })}</div>
  </section>
}

export function EventsPage() {
  const { events } = useEventStore()
  const { city } = useExploreCity()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [category, setCategory] = useState('All events')
  const [view, setView] = useState<ViewMode>('cards')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [location, setLocation] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('any')
  const [priceFilter, setPriceFilter] = useState<'any' | 'free' | 'paid'>('any')
  const [sort, setSort] = useState<SortMode>('soonest')
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const now = new Date()

  const visibleEvents = useMemo(() => {
    const search = query.trim().toLowerCase()
    const filtered = events.filter((event) => {
      const matchesCategory = category === 'All events' || event.categoryNames.includes(category)
      const matchesCity = (event.city ?? 'Toronto') === city
      const searchable = `${event.title} ${event.description} ${event.locationName} ${event.address ?? ''} ${event.categoryNames.join(' ')}`.toLowerCase()
      const matchesLocation = !location.trim() || `${event.locationName} ${event.address ?? ''}`.toLowerCase().includes(location.trim().toLowerCase())
      const startsAt = new Date(event.startsAt)
      const matchesDate = dateFilter === 'any' || (dateFilter === 'week' ? startsAt >= now && startsAt <= new Date(now.getTime() + 7 * 86400000) : startsAt.getMonth() === now.getMonth() && startsAt.getFullYear() === now.getFullYear())
      const matchesPrice = priceFilter === 'any' || (priceFilter === 'free' ? (event.priceAmount ?? 0) === 0 : (event.priceAmount ?? 0) > 0)
      return event.status === 'scheduled' && matchesCity && matchesCategory && searchable.includes(search) && matchesLocation && matchesDate && matchesPrice
    })
    return filtered.sort((a, b) => sort === 'popular' ? b.participantCount - a.participantCount : sort === 'price' ? (a.priceAmount ?? 0) - (b.priceAmount ?? 0) : new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
  }, [category, city, dateFilter, events, location, now, priceFilter, query, sort])

  const suggestions = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return { matchingEvents: [], matchingCategories: [] }
    const matchingEvents = events.filter((event) => event.status === 'scheduled' && (event.city ?? 'Toronto') === city && `${event.title} ${event.locationName} ${event.categoryNames.join(' ')}`.toLowerCase().includes(search)).slice(0, 4)
    const matchingCategories = eventCategories.filter((item) => item !== 'All events' && item.toLowerCase().includes(search)).slice(0, 2)
    return { matchingEvents, matchingCategories }
  }, [city, events, query])

  const calendarEvents = visibleEvents.filter((event) => {
    const date = new Date(event.startsAt)
    return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()
  })

  function clearFilters() {
    setCategory('All events'); setLocation(''); setDateFilter('any'); setPriceFilter('any'); setQuery(''); setSort('soonest')
  }

  return <div className="space-y-7">
    <section className="flex flex-col justify-between gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-700">Explore {city}</p><h1 className="mt-1.5 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">Make plans. Meet your people.</h1><p className="mt-2 text-sm text-stone-500">Find a local event, then find someone to enjoy it with.</p></div>
      <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white p-1 shadow-sm" role="group" aria-label="Event view">
        {([{ id: 'cards', label: 'Cards', icon: ListFilter }, { id: 'calendar', label: 'Calendar', icon: CalendarDays }, { id: 'map', label: 'Map', icon: MapPin }] as const).map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition sm:px-3 ${view === id ? 'bg-brand-600 text-slate-950 shadow-sm' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'}`}><Icon size={14} />{label}</button>)}
      </div>
    </section>

    <section className="space-y-5" aria-label="Find events">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <label className="relative block"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><Input aria-label="Search events" aria-expanded={Boolean(query && searchOpen)} aria-controls="event-search-suggestions" role="combobox" autoComplete="off" placeholder="Search events, places, or interests…" className="h-12 pl-10 pr-10" value={query} onFocus={() => setSearchOpen(true)} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true) }} onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false); if (event.key === 'Enter') setSearchOpen(false) }} onBlur={() => window.setTimeout(() => setSearchOpen(false), 140)} />{query && <button type="button" aria-label="Clear search" onMouseDown={(event) => event.preventDefault()} onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"><X size={16} /></button>}</label>
          {query && searchOpen && <div id="event-search-suggestions" role="listbox" className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-stone-200 bg-white py-2 shadow-xl">
            {suggestions && suggestions.matchingEvents.map((event) => <button key={event.id} type="button" role="option" onMouseDown={(e) => e.preventDefault()} onClick={() => navigate(`/events/${event.id}`)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-50"><CalendarDays size={16} className="shrink-0 text-brand-600" /><span className="min-w-0"><span className="block truncate text-sm font-semibold text-stone-800">{event.title}</span><span className="block truncate text-xs text-stone-500">{event.locationName} · {event.categoryNames[0]}</span></span></button>)}
            {suggestions && suggestions.matchingCategories.map((item) => <button key={item} type="button" role="option" onMouseDown={(e) => e.preventDefault()} onClick={() => { setCategory(item); setSearchOpen(false) }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-50"><Search size={15} className="shrink-0 text-stone-400" /><span className="text-sm text-stone-700">Browse <strong>{item}</strong> events</span></button>)}
            {suggestions && suggestions.matchingEvents.length === 0 && suggestions.matchingCategories.length === 0 && <p className="px-4 py-3 text-sm text-stone-500">No matching events or categories. Your search still filters the list.</p>}
          </div>}
        </div>
        <label className="relative block lg:w-56"><MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-600" /><Input aria-label="Filter by location" placeholder="Location" className="h-12 pl-10" value={location} onChange={(event) => setLocation(event.target.value)} /></label>
        <Button variant="outline" className="h-12" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={16} />Filters {(dateFilter !== 'any' || priceFilter !== 'any') && <span className="grid size-5 place-items-center rounded-full bg-brand-600 text-[10px] text-slate-950">{Number(dateFilter !== 'any') + Number(priceFilter !== 'any')}</span>}<ChevronDown size={14} className={`transition ${filtersOpen ? 'rotate-180' : ''}`} /></Button>
      </div>

      {filtersOpen && <div className="grid gap-4 rounded-2xl border border-brand-100 bg-brand-50/50 p-4 sm:grid-cols-3 sm:items-end">
        <label className="space-y-1.5 text-xs font-semibold text-stone-600">When<select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)} className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm font-normal text-stone-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"><option value="any">Any date</option><option value="week">Next 7 days</option><option value="month">This month</option></select></label>
        <label className="space-y-1.5 text-xs font-semibold text-stone-600">Price<select value={priceFilter} onChange={(event) => setPriceFilter(event.target.value as typeof priceFilter)} className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm font-normal text-stone-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"><option value="any">Any price</option><option value="free">Free</option><option value="paid">Paid</option></select></label>
        <Button variant="ghost" className="h-10 justify-self-start text-brand-700 hover:bg-brand-100 sm:justify-self-end" onClick={clearFilters}>Clear all</Button>
      </div>}

      <div className="flex gap-2 overflow-x-auto pb-1">{eventCategories.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${category === item ? 'border-brand-600 bg-brand-600 text-slate-950' : 'border-stone-200 bg-white text-stone-600 hover:border-brand-300 hover:text-brand-700'}`}>{item}</button>)}</div>

      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-stone-500"><span className="font-semibold text-stone-800">{view === 'calendar' ? calendarEvents.length : visibleEvents.length} events</span> {view === 'calendar' ? `in ${monthLabel(month)}` : 'coming up'}</p><label className="flex items-center gap-2 text-xs font-semibold text-stone-500"><span className="hidden sm:inline">Sort by</span><select aria-label="Sort events" value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 outline-none focus:border-brand-400"><option value="soonest">Soonest</option><option value="popular">Most popular</option><option value="price">Price: low to high</option></select></label></div>

      {view === 'map' ? <Suspense fallback={<div className="grid min-h-[420px] place-items-center rounded-2xl border border-stone-200 bg-stone-50 text-sm text-stone-500">Loading interactive map…</div>}><EventsMap events={visibleEvents} city={city} /></Suspense>
        : visibleEvents.length === 0 ? <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center"><p className="font-semibold text-stone-800">{events.some((event) => (event.city ?? 'Toronto') === city) ? 'No events match those filters.' : `No events in ${city} yet.`}</p><p className="mt-1 text-sm text-stone-500">{events.some((event) => (event.city ?? 'Toronto') === city) ? 'Try a different keyword, location, or date range.' : 'Choose another city to explore available events.'}</p><Button variant="secondary" size="sm" className="mt-4" onClick={clearFilters}>Clear filters</Button></div>
          : view === 'cards' ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{visibleEvents.map((event) => <EventCard event={event} key={event.id} />)}</div>
            : <CalendarView events={visibleEvents} month={month} onMonthChange={setMonth} />}
    </section>
    <div className="sr-only" aria-live="polite">Showing {visibleEvents.length} events</div>
  </div>
}
