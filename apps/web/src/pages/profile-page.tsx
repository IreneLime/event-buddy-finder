import { useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ArrowLeft, CalendarDays, Camera, Edit3, Heart, MapPin, MessageCircle, Sparkles } from 'lucide-react'
import { Avatar } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Field } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { EventCard } from '../components/event-card'
import { useEventStore } from '../state/event-store'

const profileInterests = ['Arts & crafts', 'Food', 'Walks', 'Live music']
const ageRanges = [
  { value: 'under_18', label: 'Under 18' },
  { value: '18_24', label: '18–24' },
  { value: '25_34', label: '25–34' },
  { value: '35_44', label: '35–44' },
  { value: '45_plus', label: '45+' },
]

export function ProfilePage() {
  const location = useLocation()
  const { userId } = useParams()
  const isEditing = location.pathname.endsWith('/edit')
  const isOwnProfile = !userId || userId === 'cathy'
  const [name, setName] = useState('Cathy Chen')
  const [affiliation, setAffiliation] = useState('University of Toronto · ECE')
  const [ageRange, setAgeRange] = useState('18_24')
  const [bio, setBio] = useState('Always up for a new café, a slow walk, or an excuse to try something creative. Still learning how to make pottery without making a lopsided bowl.')
  const [saved, setSaved] = useState(false)
  const { events } = useEventStore()
  const attendedEvents = events.filter((event) => event.viewerParticipation === 'going')
  const ageRangeLabel = ageRanges.find((range) => range.value === ageRange)?.label ?? '18–24'

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2200)
  }

  if (isEditing) return <div className="mx-auto max-w-3xl space-y-6">
    <Button asChild variant="ghost" size="sm"><Link to="/profile"><ArrowLeft size={15} />Back to profile</Link></Button>
    <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-rose-700">Your profile</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Edit your details</h1><p className="mt-2 text-sm text-stone-500">Let people know a little about you and the things you like.</p></div>
    <form onSubmit={saveProfile}><Card className="space-y-6 p-5 sm:p-8">
      <div className="flex items-center gap-4"><div className="relative"><Avatar name={name} className="size-16 text-base" /><button type="button" aria-label="Change profile photo" className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border-2 border-white bg-rose-600 text-white"><Camera size={13} /></button></div><div><p className="text-sm font-semibold text-stone-800">Profile photo</p><p className="mt-1 text-xs text-stone-500">Image upload will connect to cloud storage later.</p></div></div>
      <Field label="Display name"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <div className="grid gap-5 sm:grid-cols-2"><Field label="Age range"><select value={ageRange} onChange={(e) => setAgeRange(e.target.value)} className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100">{ageRanges.map((range) => <option key={range.value} value={range.value}>{range.label}</option>)}</select></Field><Field label="Affiliation" hint="School, program, workplace, or community"><Input value={affiliation} onChange={(e) => setAffiliation(e.target.value)} placeholder="e.g. University of Toronto" /></Field></div>
      <Field label="A little about you"><textarea rows={4} maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} className="w-full resize-y rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm leading-6 outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100" /></Field>
      <div><p className="mb-2 text-sm font-medium text-stone-700">Things you’re into</p><div className="flex flex-wrap gap-2">{profileInterests.map((interest) => <button type="button" key={interest} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">{interest} <span aria-hidden="true">×</span></button>)}<button type="button" className="rounded-full border border-dashed border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-500">+ Add interest</button></div></div>
      <div className="flex items-center justify-end gap-3 border-t border-stone-100 pt-5"><Button asChild variant="outline"><Link to="/profile">Cancel</Link></Button><Button type="submit">Save profile</Button></div>
      {saved && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Profile changes saved in this prototype.</p>}
    </Card></form>
  </div>

  return <div className="space-y-7">
    <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-rose-700">A little about me</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">{isOwnProfile ? 'My profile' : 'Community profile'}</h1></div>{isOwnProfile && <Button asChild variant="outline"><Link to="/profile/edit"><Edit3 size={15} />Edit profile</Link></Button>}</div>
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-5">
        <Card className="overflow-hidden"><div className="profile-cover relative h-28"><span className="profile-sparkle"><Sparkles size={22} /></span></div><div className="px-5 pb-5"><Avatar name={name} className="-mt-8 size-[68px] border-4 border-white text-lg" /><h2 className="mt-3 text-xl font-bold text-stone-900">{name}</h2><p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500"><MapPin size={13} />Toronto, ON</p><p className="mt-4 text-sm leading-6 text-stone-600">{bio}</p><div className="mt-4 flex flex-wrap gap-1.5">{profileInterests.map((interest) => <Badge key={interest} className="bg-rose-50 text-rose-700">{interest}</Badge>)}</div><div className="mt-5 border-t border-stone-100 pt-4 text-xs text-stone-500"><p className="font-semibold text-stone-700">Affiliation</p><p className="mt-1">{affiliation}</p><p className="mt-3 font-semibold text-stone-700">Age range</p><p className="mt-1">{ageRangeLabel}</p></div>{!isOwnProfile && <Button className="mt-5 w-full" variant="secondary"><MessageCircle size={15} />Message Cathy</Button>}</div></Card>
        <Card className="p-5"><p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">My activity</p><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-stone-50 p-3"><p className="text-2xl font-bold text-stone-900">{events.filter((event) => event.organizerName === name).length}</p><p className="mt-1 text-[11px] text-stone-500">events hosted</p></div><div className="rounded-xl bg-rose-50 p-3"><p className="text-2xl font-bold text-rose-700">{attendedEvents.length}</p><p className="mt-1 text-[11px] text-stone-500">events going</p></div></div></Card>
      </aside>
      <div className="space-y-6">
        <Card className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-bold text-stone-900">A few things I’m excited about</h2><p className="mt-1 text-xs text-stone-500">Events Cathy marked as going</p></div><Heart size={18} className="text-rose-500" /></div>{attendedEvents.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2">{attendedEvents.slice(0, 2).map((event) => <EventCard key={event.id} event={event} />)}</div> : <p className="mt-5 rounded-xl bg-stone-50 p-5 text-sm text-stone-500">No upcoming events yet. <Link to="/events" className="font-semibold text-rose-700">Find something to do</Link></p>}</Card>
        <Card className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-bold text-stone-900">Events I’m interested in</h2><p className="mt-1 text-xs text-stone-500">Plans I’m still thinking about</p></div><CalendarDays size={18} className="text-stone-400" /></div><div className="mt-5 space-y-3">{events.filter((event) => event.viewerParticipation === 'interested').map((event) => <Link key={event.id} to={`/events/${event.id}`} className="flex items-center justify-between rounded-xl bg-stone-50 p-3 transition hover:bg-rose-50"><div><p className="text-sm font-semibold text-stone-800">{event.title}</p><p className="mt-1 text-xs text-stone-500">{event.startsAt.slice(0, 10)} · {event.locationName}</p></div><span className="text-xs font-semibold text-rose-700">Details →</span></Link>)}</div></Card>
      </div>
    </div>
  </div>
}
