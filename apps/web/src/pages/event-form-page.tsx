import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, ImagePlus, MapPin } from 'lucide-react'
import type { EventSummary } from '@event-buddy/contracts'
import { eventCategories } from '../data/mock-events'
import { useEventStore } from '../state/event-store'
import { useAuth } from '../state/auth-store'
import { Field } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'

export function EventFormPage() {
  const { eventId } = useParams()
  const { getEvent, loading, error, refresh } = useEventStore()
  const event = eventId ? getEvent(eventId) : undefined
  if (loading) return <p role="status" className="p-10 text-center">Loading event…</p>
  if (error) return <div role="alert" className="p-10 text-center">{error}<Button onClick={() => void refresh()}>Retry</Button></div>
  if (eventId && !event) return <p role="alert" className="p-10 text-center">Event not found.</p>
  return <EventForm key={event?.id ?? 'new'} event={event} />
}

function localDateTime(value: string) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function EventForm({ event }: { event?: EventSummary }) {
  const navigate = useNavigate()
  const { saveEvent } = useEventStore()
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [city, setCity] = useState(event?.city ?? 'Toronto')
  const [location, setLocation] = useState(event?.locationName ?? '')
  const [address, setAddress] = useState(event?.address ?? '')
  const [startsAt, setStartsAt] = useState(localDateTime(event?.startsAt ?? new Date(Date.now() + 86_400_000).toISOString()))
  const [endsAt, setEndsAt] = useState(event?.endsAt ? localDateTime(event.endsAt) : '')
  const [price, setPrice] = useState(event?.priceAmount?.toString() ?? '0')
  const [selectedCategory, setSelectedCategory] = useState(event?.categoryNames[0] ?? '')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const draft: EventSummary = {
      ...event,
      id: event?.id ?? `event-${Date.now()}`,
      title,
      description,
      notes,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      locationName: location,
      city,
      address,
      latitude: event?.latitude,
      longitude: event?.longitude,
      categoryNames: selectedCategory === event?.categoryNames[0] ? event.categoryNames : selectedCategory ? [selectedCategory] : [],
      priceAmount: Number(price) || 0,
      status: event?.status ?? 'scheduled',
      organizerName: user?.displayName ?? '',
      participantCount: event?.participantCount ?? 1,
      viewerParticipation: event?.viewerParticipation,
    }
    try {
      const saved = await saveEvent(draft)
      navigate(`/events/${saved.id}`)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save the event.') }
    finally { setSaving(false) }
  }

  return <div className="mx-auto max-w-3xl space-y-6">
    <Button asChild variant="ghost" size="sm"><Link to={event ? `/events/${event.id}` : '/events'}><ArrowLeft size={15} />Back</Link></Button>
    <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-700">Make a plan</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">{event ? 'Edit your event' : 'Create an event'}</h1><p className="mt-2 text-sm text-stone-500">Share something you love and invite people to join.</p></div>
    <form onSubmit={handleSubmit}>
      <Card className="space-y-6 p-5 sm:p-8">
        <Field label="Event name"><Input required minLength={4} maxLength={100} placeholder="e.g. Sunday Clay Club" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Description" hint="What will people do? What should they know before joining?"><textarea required minLength={12} rows={5} className="w-full resize-y rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm leading-6 text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100" placeholder="Tell people what makes this event special…" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="grid gap-5 sm:grid-cols-2"><Field label="Date and time"><Input required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></Field><Field label="End date and time" hint="Optional"><Input type="datetime-local" min={startsAt} value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></Field></div>
        <Field label="Category"><select required value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm text-stone-800 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"><option value="">Choose a category</option>{eventCategories.filter((category) => category !== 'All events').map((category) => <option key={category}>{category}</option>)}</select></Field>
        <Field label="City"><select required value={city} onChange={(e) => setCity(e.target.value)} className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm text-stone-800 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100">{['Toronto', 'Mississauga', 'Brampton', 'Markham', 'Vaughan', 'Richmond Hill', 'Oakville'].map((name) => <option key={name}>{name}</option>)}</select></Field>
        <Field label="Location"><div className="relative"><MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><Input required className="pl-10" placeholder="Place or venue name" value={location} onChange={(e) => setLocation(e.target.value)} /></div></Field>
        <Field label="Address or meeting point"><Input placeholder="Street address or useful directions" value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <Field label="Notes for attendees" hint="Meeting point, what to bring, accessibility, or other useful details"><textarea rows={3} maxLength={1000} className="w-full resize-y rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm leading-6 text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100" placeholder="Help people know what to expect…" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <div className="grid gap-5 sm:grid-cols-2"><Field label="Price per person (CAD)"><Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></Field><Field label="Event image"><label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-3 text-sm font-medium text-stone-600 hover:border-brand-300 hover:bg-brand-50"><ImagePlus size={16} />Choose an image<input type="file" accept="image/*" className="sr-only" /></label></Field></div>
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-xs leading-5 text-stone-600">Saving changes alerts interested and attending users. Image upload is configured separately.</p>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-stone-100 pt-5"><Button asChild variant="outline"><Link to={event ? `/events/${event.id}` : '/events'}>Cancel</Link></Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : event ? 'Save changes' : 'Post event'}</Button></div>
      </Card>
    </form>
  </div>
}
