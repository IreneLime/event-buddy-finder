import { ArrowRight, CalendarDays, Compass, Users } from 'lucide-react'
import { Link } from 'react-router'
import { useEventStore } from '../state/event-store'
import { useExploreCity } from '../state/explore-city'
import { EventCard } from '../components/event-card'
import { Button } from '../components/ui/button'
import gatheringImage from '../assets/home-gathering.jpg'

const ideas = [
  { emoji: '🎶', label: 'Live music', tone: 'bg-[#f6e8dc]' },
  { emoji: '🍜', label: 'Food finds', tone: 'bg-[#e1f1e8]' },
  { emoji: '🎨', label: 'Make something', tone: 'bg-[#ebe7f7]' },
  { emoji: '🌿', label: 'Get outside', tone: 'bg-[#e3f2ef]' },
]

export function HomePage() {
  const { events } = useEventStore()
  const { city } = useExploreCity()
  const featured = events
    .filter((event) => event.status === 'scheduled' && (event.city ?? 'Toronto') === city)
    .sort((a, b) => b.participantCount - a.participantCount)
    .slice(0, 3)

  return <div className="space-y-16 pb-8">
    <section className="relative isolate flex min-h-[560px] items-center overflow-hidden bg-stone-900 px-5 py-16 sm:min-h-[620px] sm:px-10 lg:px-16" aria-labelledby="home-heading">
      <img src={gatheringImage} alt="" className="home-gathering-image absolute inset-0 -z-20 h-full w-full object-cover object-center" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(32,25,20,.54)_0%,rgba(32,25,20,.40)_35%,rgba(32,25,20,.12)_72%,rgba(32,25,20,.08)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/15 via-transparent to-amber-950/10" />
      <div className="mx-auto w-full max-w-[1320px]">
        <div className="max-w-[660px] text-white">
          <h1 id="home-heading" className="max-w-[620px] text-5xl font-semibold leading-[1.04] tracking-[-0.04em] sm:text-6xl lg:text-[76px]">A city feels smaller when you have someone to go with.</h1>
          <p className="mt-6 max-w-[520px] text-lg leading-8 text-white/90 sm:text-xl">Find a plan that sounds like you, meet people who are into it too, and turn “maybe someday” into a story from this weekend.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full border border-white/40 bg-[#f28c45] px-6 text-[#2b1d14] shadow-lg shadow-black/20 hover:bg-[#ffa15e]"><Link to="/events">Find your next plan<ArrowRight size={17} /></Link></Button>
            <Link to="/events" className="rounded-full border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">See how it works</Link>
          </div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8" aria-labelledby="idea-heading">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="text-sm font-bold uppercase tracking-[.14em] text-brand-800">Start with a feeling</p><h2 id="idea-heading" className="mt-2 max-w-xl text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">What sounds like a good day?</h2><p className="mt-2 text-base leading-7 text-stone-600">Pick a little curiosity. We’ll help with the plan and the company.</p></div>
        <Link to="/events" className="inline-flex items-center gap-2 text-base font-bold text-brand-800 hover:text-brand-900">Explore everything<ArrowRight size={16} /></Link>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {ideas.map(({ emoji, label, tone }) => <Link key={label} to="/events" className="group flex min-h-[118px] items-center gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_2px_10px_rgba(41,37,36,.03)] transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg sm:min-h-[140px] sm:p-5"><span className={`grid size-14 shrink-0 place-items-center rounded-2xl text-3xl transition group-hover:rotate-[-5deg] ${tone}`}>{emoji}</span><span className="text-base font-bold leading-snug text-stone-800 sm:text-lg">{label}</span></Link>)}
      </div>
    </section>

    <section className="bg-[#fff8f2] py-14 sm:py-16" aria-label="How Event Buddy works">
      <div className="mx-auto grid max-w-[1320px] gap-9 px-4 sm:px-6 md:grid-cols-[.8fr_1.2fr] md:items-center lg:px-8">
        <div><p className="text-sm font-bold uppercase tracking-[.14em] text-brand-800">No awkward first step required</p><h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-4xl">The plan is the icebreaker.</h2><p className="mt-4 max-w-md text-base leading-7 text-stone-600">A shared activity makes meeting someone new feel easy. Show interest, join the event chat, and arrive already knowing a few names.</p><Button asChild variant="outline" className="mt-6 rounded-full border-brand-200 bg-white"><Link to="/events">Find a shared interest<ArrowRight size={16} /></Link></Button></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm"><span className="grid size-10 place-items-center rounded-xl bg-brand-100 text-brand-900"><Compass size={19} /></span><p className="mt-4 text-base font-bold text-stone-900">Find your thing</p><p className="mt-1 text-sm leading-6 text-stone-600">Browse local plans by date, place, or what you love.</p></div>
          <div className="rounded-2xl bg-white p-5 shadow-sm"><span className="grid size-10 place-items-center rounded-xl bg-[#f7ebdc] text-amber-800"><Users size={19} /></span><p className="mt-4 text-base font-bold text-stone-900">Meet your people</p><p className="mt-1 text-sm leading-6 text-stone-600">See who’s interested and say hello in the event chat.</p></div>
          <div className="rounded-2xl bg-white p-5 shadow-sm"><span className="grid size-10 place-items-center rounded-xl bg-[#e9e5f4] text-violet-800"><CalendarDays size={19} /></span><p className="mt-4 text-base font-bold text-stone-900">Make it a plan</p><p className="mt-1 text-sm leading-6 text-stone-600">Choose “going” and look forward to being there.</p></div>
        </div>
      </div>
    </section>

    <section className="bg-[#fff8f2] py-14 sm:py-16" aria-labelledby="featured-heading">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#ffe8d5] px-3 py-1.5 text-xs font-bold uppercase tracking-[.13em] text-[#985127]"><span className="size-1.5 rounded-full bg-[#df8950]" />Curated around {city}</p>
            <h2 id="featured-heading" className="mt-4 text-4xl font-semibold leading-[1.08] tracking-[-.035em] text-stone-950 sm:text-5xl">Good plans are <span className="text-[#b96532]">happening nearby.</span></h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-stone-600">From live music to market mornings, find something worth stepping out for in {city}.</p>
          </div>
          <Link to="/events" className="hidden shrink-0 items-center gap-2 rounded-full border border-[#e8c9b2] bg-white px-4 py-2.5 text-sm font-bold text-[#85451f] transition hover:border-[#d99a6b] hover:bg-[#fffaf6] sm:inline-flex">Explore all events<ArrowRight size={16} /></Link>
        </div>
        {featured.length > 0 ? <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{featured.map((event) => <EventCard key={event.id} event={event} />)}</div> : <div className="mt-8 rounded-3xl border border-dashed border-[#e8c9b2] bg-white/70 p-8 text-center"><p className="font-semibold text-stone-800">New plans are taking shape in {city}.</p><p className="mt-1 text-sm text-stone-500">Explore other cities or check back soon.</p><Button asChild variant="outline" className="mt-4"><Link to="/events">Browse events</Link></Button></div>}
        <div className="mt-5 text-center sm:hidden"><Link to="/events" className="inline-flex items-center gap-2 rounded-full border border-[#e8c9b2] bg-white px-4 py-2 text-sm font-bold text-[#85451f]">Explore all events<ArrowRight size={16} /></Link></div>
      </div>
    </section>

    <section className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-[28px] bg-[#38261d] px-6 py-10 text-white sm:px-10 sm:py-12 lg:px-14">
        <div className="hero-glow hero-glow-one" aria-hidden="true" />
          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center"><div><p className="text-sm font-bold uppercase tracking-[.14em] text-brand-300">Your next story starts nearby</p><h2 className="mt-2 max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Come for the event. Leave with a new connection.</h2></div><Button asChild size="lg" className="shrink-0 rounded-full bg-white text-stone-900 hover:bg-brand-50"><Link to="/events">Explore {city}<ArrowRight size={17} /></Link></Button></div>
      </div>
    </section>
  </div>
}
