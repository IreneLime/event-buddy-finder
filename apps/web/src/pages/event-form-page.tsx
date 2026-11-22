import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, MapPin, Sparkles } from 'lucide-react'
import type { EventSummary } from '@event-buddy/contracts'
import { useEventDetails, useEventStore } from '../state/event-store'
import { useAuth } from '../state/auth-store'
import { ApiImage } from '../components/api-image'
import { PhotoField } from '../components/photo-field'
import { errorMessage, imageApi, imagePath } from '../lib/backend-api'
import { Field } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'

export function EventFormPage() {
  const { eventId } = useParams()
  const { event, loading, error, retry } = useEventDetails(eventId)
  const { live: liveAuth, user } = useAuth()
  const { live, categoriesLoading, categoriesError, retryCategories } = useEventStore()
  if (loading || categoriesLoading) return <p role="status" className="p-8">Loading event form…</p>
  if (error || categoriesError) return <div role="alert" className="p-8">{error || categoriesError} <Button onClick={error ? retry : retryCategories}>Try again</Button></div>
  if (eventId && !event) return <div className="py-20 text-center"><h1 className="text-2xl font-bold">Event not found</h1><Button asChild variant="secondary" className="mt-5"><Link to="/events">Back to events</Link></Button></div>
  if (liveAuth && !user?.emailVerified) return <div className="p-8"><Link to="/profile/edit">Verify your email in your profile to continue.</Link></div>
  if (live && !liveAuth && !import.meta.env.DEV) return <p className="p-8">Firebase sign-in is required to create or edit server events.</p>
  if (liveAuth && !live) return <p className="p-8">Event editing is unavailable until the events API is connected.</p>

  return <EventEditor key={eventId ?? 'new'} event={event} />
}

function localDateTime(value?: string) {
  const date = value ? new Date(value) : new Date(Date.now() + 86_400_000)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function EventEditor({ event }: { event?: EventSummary }) {
  const navigate = useNavigate()
  const { user, getToken } = useAuth()
  const { saveEvent, live, categories } = useEventStore()
  const [savedId, setSavedId] = useState(event?.id)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [photoRevision, setPhotoRevision] = useState(0)
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [city, setCity] = useState(event?.city ?? 'Toronto')
  const [location, setLocation] = useState(event?.locationName ?? '')
  const [address, setAddress] = useState(event?.address ?? '')
  const [startsAt, setStartsAt] = useState(localDateTime(event?.startsAt))
  const [endsAt, setEndsAt] = useState(() => {
    if (event) return event.endsAt ? localDateTime(event.endsAt) : ''
    const start = new Date(Date.now() + 24 * 60 * 60_000)
    return localDateTime(new Date(start.getTime() + 2 * 60 * 60_000).toISOString())
  })
  const [price, setPrice] = useState(event?.priceAmount?.toString() ?? '0')
  const [selectedCategory, setSelectedCategory] = useState(event?.categoryNames[0] ?? '')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const saved: EventSummary = {
        id: savedId ?? `event-${Date.now()}`,
        title,
        description,
        notes,
        startsAt: localDateTime(event?.startsAt) === startsAt && event ? event.startsAt : new Date(startsAt).toISOString(),
        endsAt: endsAt
          ? event?.endsAt && localDateTime(event.endsAt) === endsAt
            ? event.endsAt
            : new Date(endsAt).toISOString()
          : undefined,
        locationName: location,
        city,
        address,
        latitude: event?.latitude,
        longitude: event?.longitude,
        categoryNames: selectedCategory === event?.categoryNames[0] ? event.categoryNames : [selectedCategory],
        priceAmount: Number(price) || 0,
        status: event?.status ?? 'scheduled',
        organizerName: user?.displayName ?? 'Member',
        participantCount: event?.participantCount ?? 0,
        viewerParticipation: event?.viewerParticipation,
      }
      const result = await saveEvent(saved, savedId)
      setSavedId(result.id)
      if (live && file) {
        try {
          const token = await getToken()
          if (!token) throw new Error('Please sign in again.')
          await imageApi.upload(imagePath('event', result.id), file, token)
        } catch (error) {
          setError('Event saved. Photo upload failed: ' + errorMessage(error))
          return
        }
      }
      navigate('/events/' + result.id)
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }

  async function removePhoto() {
    if (!savedId) return
    setBusy(true)
    setError('')
    try {
      const token = await getToken()
      if (!token) throw new Error('Please sign in again.')
      await imageApi.remove(imagePath('event', savedId), token)
      setPhotoRevision((value) => value + 1)
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }

  return <div className="mx-auto max-w-3xl space-y-6">
    <Button asChild variant="ghost" size="sm"><Link to={event ? `/events/${event.id}` : '/events'}><ArrowLeft size={15} />Back</Link></Button>
    <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-700">Make a plan</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">{savedId ? 'Edit your event' : 'Create an event'}</h1><p className="mt-2 text-sm text-stone-500">Share something you love and invite people to join.</p></div>
    <form onSubmit={handleSubmit}>
      <Card className="space-y-6 p-5 sm:p-8">
        <Field label="Event name"><Input required minLength={4} maxLength={100} placeholder="e.g. Sunday Clay Club" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Description" hint="What will people do? What should they know before joining?"><textarea required minLength={12} rows={5} className="w-full resize-y rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm leading-6 text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100" placeholder="Tell people what makes this event special…" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="grid gap-5 sm:grid-cols-2"><Field label="Start date and time"><Input required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></Field><Field label="End date and time" hint="Optional"><Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></Field></div>
        <Field label="Category"><select required value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm text-stone-800 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"><option value="">Choose a category</option>{Array.from(new Set([...categories, ...(event?.categoryNames ?? [])])).map((category) => <option key={category}>{category}</option>)}</select></Field>
        <Field label="City"><select required value={city} onChange={(e) => setCity(e.target.value)} className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm text-stone-800 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100">{['Toronto', 'Mississauga', 'Brampton', 'Markham', 'Vaughan', 'Richmond Hill', 'Oakville'].map((name) => <option key={name}>{name}</option>)}</select></Field>
        <Field label="Location"><div className="relative"><MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><Input required className="pl-10" placeholder="Place or venue name" value={location} onChange={(e) => setLocation(e.target.value)} /></div></Field>
        <Field label="Address or meeting point"><Input placeholder="Street address or useful directions" value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <Field label="Notes for attendees" hint="Meeting point, what to bring, accessibility, or other useful details"><textarea rows={3} maxLength={1000} className="w-full resize-y rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm leading-6 text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100" placeholder="Help people know what to expect…" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <div className="grid gap-5 sm:grid-cols-2"><Field label="Price per person (CAD)"><Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>{live && <PhotoField label="Event image" file={file} onChange={setFile} disabled={busy} />}</div>
        {live && savedId && <div className="space-y-2"><ApiImage kind="event" id={savedId} revision={photoRevision} className="max-h-40 rounded-xl object-cover" /><Button variant="outline" type="button" disabled={busy} onClick={() => void removePhoto()}>Remove photo</Button></div>}
        {!live && <p className="text-sm text-stone-600"><Sparkles size={14} className="mr-1 inline" />Demo changes are saved for this session.</p>}
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-stone-100 pt-5"><Button asChild variant="outline"><Link to={event ? `/events/${event.id}` : '/events'}>Cancel</Link></Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : savedId ? 'Save changes' : 'Post event'}</Button></div>
      </Card>
    </form>
  </div>
}
