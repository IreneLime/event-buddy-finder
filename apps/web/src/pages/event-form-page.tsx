import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, ImagePlus, MapPin, Sparkles } from 'lucide-react'
import type { EventSummary } from '@event-buddy/contracts'
import { eventCategories } from '../data/mock-events'
import { useEventStore } from '../state/event-store'
import { Field } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'

export function EventFormPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { getEvent, saveEvent } = useEventStore()
  const event = eventId ? getEvent(eventId) : undefined
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [location, setLocation] = useState(event?.locationName ?? '')
  const [address, setAddress] = useState(event?.address ?? '')
  const [startsAt, setStartsAt] = useState(event?.startsAt.slice(0, 16) ?? '2026-11-30T18:00')
  const [price, setPrice] = useState(event?.priceAmount?.toString() ?? '0')
  const [selectedCategory, setSelectedCategory] = useState(event?.categoryNames[0] ?? '')

  if (eventId && !event) return <div className="py-20 text-center"><h1 className="text-2xl font-bold">Event not found</h1><Button asChild variant="secondary" className="mt-5"><Link to="/events">Back to events</Link></Button></div>

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const saved: EventSummary = {
      id: event?.id ?? `event-${Date.now()}`,
      title,
      description,
      startsAt: new Date(startsAt).toISOString(),
      locationName: location,
      address,
      categoryNames: selectedCategory ? [selectedCategory] : [],
      priceAmount: Number(price) || 0,
      status: event?.status ?? 'scheduled',
      organizerName: 'Cathy Chen',
      participantCount: event?.participantCount ?? 1,
      viewerParticipation: event?.viewerParticipation,
    }
    saveEvent(saved)
    navigate(`/events/${saved.id}`)
  }

  return <div className="mx-auto max-w-3xl space-y-6">
    <Button asChild variant="ghost" size="sm"><Link to={event ? `/events/${event.id}` : '/events'}><ArrowLeft size={15} />Back</Link></Button>
    <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-rose-700">Make a plan</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">{event ? 'Edit your event' : 'Create an event'}</h1><p className="mt-2 text-sm text-stone-500">Share something you love and invite people to join.</p></div>
    <form onSubmit={handleSubmit}>
      <Card className="space-y-6 p-5 sm:p-8">
        <Field label="Event name"><Input required minLength={4} maxLength={100} placeholder="e.g. Sunday Clay Club" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Description" hint="What will people do? What should they know before joining?"><textarea required minLength={12} rows={5} className="w-full resize-y rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm leading-6 text-stone-900 outline-none placeholder:text-stone-400 focus:border-rose-300 focus:ring-4 focus:ring-rose-100" placeholder="Tell people what makes this event special…" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="grid gap-5 sm:grid-cols-2"><Field label="Date and time"><Input required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></Field><Field label="Category"><select required value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm text-stone-800 outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100"><option value="">Choose a category</option>{eventCategories.filter((category) => category !== 'All events').map((category) => <option key={category}>{category}</option>)}</select></Field></div>
        <Field label="Location"><div className="relative"><MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><Input required className="pl-10" placeholder="Place or venue name" value={location} onChange={(e) => setLocation(e.target.value)} /></div></Field>
        <Field label="Address or meeting point"><Input placeholder="Street address or useful directions" value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <div className="grid gap-5 sm:grid-cols-2"><Field label="Price per person (CAD)"><Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></Field><Field label="Event image"><label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-3 text-sm font-medium text-stone-600 hover:border-rose-300 hover:bg-rose-50"><ImagePlus size={16} />Choose an image<input type="file" accept="image/*" className="sr-only" /></label></Field></div>
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800"><Sparkles size={14} className="mr-1 inline" />Prototype form: saving updates local mock data only. Image uploads and server persistence will be added later.</div>
        <div className="flex justify-end gap-3 border-t border-stone-100 pt-5"><Button asChild variant="outline"><Link to={event ? `/events/${event.id}` : '/events'}>Cancel</Link></Button><Button type="submit">{event ? 'Save changes' : 'Post event'}</Button></div>
      </Card>
    </form>
  </div>
}
