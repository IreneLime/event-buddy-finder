import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ArrowLeft, CalendarDays, Camera, Edit3, Heart, MapPin, MessageCircle, Sparkles } from 'lucide-react'
import { Avatar } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Field } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { EventCard } from '../components/event-card'
import { SignInPrompt } from '../components/sign-in-prompt'
import { useAuth } from '../state/auth-store'
import { useEventStore } from '../state/event-store'
import { demoUsers } from '../data/demo-users'

const LiveProfilePage = lazy(() => import('./live-profile-page').then(({ LiveProfilePage: Page }) => ({ default: Page })))

const ageRanges = [
  { value: 'under_18', label: 'Under 18' },
  { value: '18_24', label: '18–24' },
  { value: '25_34', label: '25–34' },
  { value: '35_44', label: '35–44' },
  { value: '45_plus', label: '45+' },
]

export function ProfilePage() {
  const { live } = useAuth()
  const { userId } = useParams()
  const { state } = useLocation()
  const fromEventId = state?.fromEventId
  const useLiveProfile = live || (userId && !demoUsers.some(({ id }) => id === userId))

  return <>
    {userId && typeof fromEventId === 'string' && fromEventId && <Button asChild variant="ghost" size="sm" className="mb-4">
      <Link to={'/events/' + encodeURIComponent(fromEventId)}><ArrowLeft size={15} />Back to event</Link>
    </Button>}
    {useLiveProfile
      ? <Suspense fallback={<p role="status" className="p-8">Loading profile…</p>}><LiveProfilePage /></Suspense>
      : <DemoProfilePage />}
  </>
}

function DemoProfilePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { userId } = useParams()
  const { user: signedInUser } = useAuth()
  const { events, live: liveEvents } = useEventStore()
  const isEditing = location.pathname.endsWith('/edit')
  const profile = userId ? demoUsers.find((candidate) => candidate.id === userId) : demoUsers.find((candidate) => candidate.id === signedInUser?.id)
  const isOwnProfile = Boolean(signedInUser && (!userId || userId === signedInUser.id))
  const [name, setName] = useState(profile?.displayName ?? '')
  const [affiliation, setAffiliation] = useState(profile?.affiliation ?? '')
  const [ageRange, setAgeRange] = useState(profile?.ageRange ?? '18_24')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [saved, setSaved] = useState(false)
  const [interests, setInterests] = useState(profile?.preferredCategories ?? [])
  const ageRangeLabel = ageRanges.find((range) => range.value === ageRange)?.label ?? '18–24'

  useEffect(() => {
    setName(profile?.displayName ?? '')
    setAffiliation(profile?.affiliation ?? '')
    setAgeRange(profile?.ageRange ?? '18_24')
    setBio(profile?.bio ?? '')
    setInterests(profile?.preferredCategories ?? [])
  }, [profile])

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2200)
  }

  if (!signedInUser) return <SignInPrompt title="Sign in to view this profile" description="Member profiles and event history are available to signed-in users. Sign in to continue to this profile." />
  if (!profile) return <div className="py-20 text-center"><h1 className="text-2xl font-bold">We couldn’t find that profile.</h1><Button asChild variant="secondary" className="mt-5"><Link to="/events">Explore events</Link></Button></div>

  const hostedEvents = events.filter((event) => profile.hostedEventIds.includes(event.id))
  const joinedEvents = events.filter((event) => profile.attendedEventIds.includes(event.id))
  const interestedEvents = isOwnProfile ? events.filter((event) => liveEvents
    ? event.viewerParticipation === 'interested' && Date.parse(event.startsAt) > Date.now()
    : profile.interestedEventIds.includes(event.id)) : []

  if (isEditing) return <div className="mx-auto max-w-3xl space-y-6">
    <Button asChild variant="ghost" size="sm"><Link to="/profile"><ArrowLeft size={15} />Back to profile</Link></Button>
    <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-700">Your profile</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Edit your details</h1><p className="mt-2 text-sm text-stone-500">Update the information shown on your public profile.</p></div>
    <form onSubmit={saveProfile}><Card className="space-y-6 p-5 sm:p-8">
      <div className="flex items-center gap-4"><div className="relative"><Avatar name={name} className="size-16 text-base" /><button type="button" aria-label="Change profile photo" className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border-2 border-white bg-brand-600 text-slate-950"><Camera size={13} /></button></div><div><p className="text-sm font-semibold text-stone-800">Profile photo</p><p className="mt-1 text-xs text-stone-500">Image upload will connect to cloud storage later.</p></div></div>
      <Field label="Display name"><Input required value={name} onChange={(event) => setName(event.target.value)} /></Field>
      <div className="grid gap-5 sm:grid-cols-2"><Field label="Age range (private)" hint="Visible only on your own profile"><select value={ageRange} onChange={(event) => setAgeRange(event.target.value as typeof ageRange)} className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100">{ageRanges.map((range) => <option key={range.value} value={range.value}>{range.label}</option>)}</select></Field><Field label="Affiliation (private)" hint="Visible only on your own profile"><Input value={affiliation} onChange={(event) => setAffiliation(event.target.value)} placeholder="School, program, or community" /></Field></div>
      <Field label="Public bio"><textarea rows={4} maxLength={500} value={bio} onChange={(event) => setBio(event.target.value)} className="w-full resize-y rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm leading-6 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100" /></Field>
      <div><p className="mb-2 text-sm font-medium text-stone-700">Public interests</p><div className="flex flex-wrap gap-2">{interests.map((interest) => <button type="button" key={interest} onClick={() => setInterests((current) => current.filter((item) => item !== interest))} className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">{interest} <span aria-hidden="true">×</span></button>)}<button type="button" onClick={() => setInterests((current) => current.includes('Outdoors') ? current : [...current, 'Outdoors'])} className="rounded-full border border-dashed border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-500">+ Add Outdoors</button></div></div>
      <div className="flex items-center justify-end gap-3 border-t border-stone-100 pt-5"><Button asChild variant="outline"><Link to="/profile">Cancel</Link></Button><Button type="submit">Save profile</Button></div>
      {saved && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Profile changes saved in this prototype.</p>}
    </Card></form>
  </div>

  return <div className="space-y-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-700">{isOwnProfile ? 'Your member profile' : 'Community member'}</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">{isOwnProfile ? 'My profile' : `${profile.displayName}’s profile`}</h1></div><div className="flex gap-2">{isOwnProfile ? <Button asChild variant="outline"><Link to="/profile/edit"><Edit3 size={15} />Edit profile</Link></Button> : <Button onClick={() => navigate(`/chats/dm-${profile.id}`)}><MessageCircle size={15} />Message {profile.displayName.split(' ')[0]}</Button>}</div></div>
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-5">
        <Card className="overflow-hidden"><div className="profile-cover relative h-28"><span className="profile-sparkle"><Sparkles size={22} /></span></div><div className="px-5 pb-7"><Avatar name={profile.displayName} className="relative z-10 -mt-8 size-[68px] border-4 border-white text-lg shadow-sm" /><h2 className="mt-3 break-words text-2xl font-bold text-stone-900">{profile.displayName}</h2><p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500"><MapPin size={13} />{profile.city}, ON</p><p className="mt-4 text-sm leading-6 text-stone-600">{profile.bio}</p><div className="mt-4 flex flex-wrap gap-1.5">{profile.preferredCategories.map((interest) => <Badge key={interest} className="bg-brand-50 text-brand-700">{interest}</Badge>)}</div>{isOwnProfile && <div className="mt-5 break-words border-t border-stone-100 pt-4 text-sm leading-6 text-stone-600"><p className="font-semibold text-stone-700">Private profile details</p><p className="mt-2">Email: {profile.email}</p><p className="mt-2">Affiliation: {affiliation || 'Not set'}</p><p className="mt-2">Age range: {ageRangeLabel}</p></div>}</div></Card>
        <Card className="p-5"><p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">Community activity</p><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-stone-50 p-3"><p className="text-2xl font-bold text-stone-900">{hostedEvents.length}</p><p className="mt-1 text-[11px] text-stone-500">events hosted</p></div><div className="rounded-xl bg-brand-50 p-3"><p className="text-2xl font-bold text-brand-700">{profile.eventHistory.length + joinedEvents.length}</p><p className="mt-1 text-[11px] text-stone-500">events joined</p></div></div></Card>
      </aside>
      <div className="space-y-6">
        <Card className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-bold text-stone-900">Past events</h2><p className="mt-1 text-xs text-stone-500">A few recent outings shared on this public profile</p></div><Heart size={18} className="text-brand-500" /></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{profile.eventHistory.map((item) => <article key={item.title} className="rounded-xl border border-stone-100 bg-[#fdfcfb] p-4"><div className="flex items-center justify-between gap-2"><Badge className="bg-brand-50 text-brand-700">{item.category}</Badge><span className="text-[10px] text-stone-400">{item.date}</span></div><h3 className="mt-3 text-sm font-bold text-stone-800">{item.title}</h3><p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500"><MapPin size={12} />{item.venue}</p></article>)}</div></Card>
        {isOwnProfile && <Card className="space-y-4 p-5 sm:p-6">
          <h2 className="font-bold text-stone-900">Interested in</h2>
          {interestedEvents.length === 0 && <p className="text-sm text-stone-500">No upcoming events marked Interested.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {interestedEvents.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        </Card>}
        {joinedEvents.length > 0 && <Card className="space-y-4 p-5 sm:p-6">
          <h2 className="font-bold text-stone-900">Going to</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {joinedEvents.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        </Card>}
        {hostedEvents.length > 0 && <Card className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-bold text-stone-900">Events hosted</h2><p className="mt-1 text-xs text-stone-500">Upcoming public events organized by {profile.displayName}</p></div><CalendarDays size={18} className="text-stone-400" /></div><div className="mt-5 grid gap-4 sm:grid-cols-2">{hostedEvents.map((event) => <EventCard key={event.id} event={event} />)}</div></Card>}
      </div>
    </div>
  </div>
}
