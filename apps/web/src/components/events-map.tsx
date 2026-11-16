import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { divIcon } from 'leaflet'
import type { EventSummary } from '@event-buddy/contracts'
import { Link } from 'react-router'
import { MapPin, Search } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { getEventEmoji } from '../data/mock-events'

type Coordinates = { latitude: number; longitude: number }
type PlaceResult = Coordinates & { label: string }

const cityCenters: Record<string, [number, number]> = {
  Toronto: [43.6532, -79.3832],
  Mississauga: [43.589, -79.6441],
  Brampton: [43.7315, -79.7624],
  Markham: [43.8561, -79.337],
  Vaughan: [43.8563, -79.5085],
  'Richmond Hill': [43.8828, -79.4403],
  Oakville: [43.4675, -79.6877],
}
const placeCache = new Map<string, PlaceResult>()
let lastPlaceSearchAt = 0

function MapCamera({ center, zoom }: { center: Coordinates; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([center.latitude, center.longitude], zoom, { animate: true })
    window.requestAnimationFrame(() => map.invalidateSize())
  }, [center, map, zoom])
  return null
}

function MapAtEvent({ event }: { event: EventSummary }) {
  const cityCenter = cityCenters[event.city ?? 'Toronto'] ?? cityCenters.Toronto
  const position: [number, number] = [event.latitude ?? cityCenter[0], event.longitude ?? cityCenter[1]]
  return <MapContainer center={position} zoom={14} scrollWheelZoom attributionControl={false} className="relative h-[300px] w-full" aria-label={`Map showing ${event.locationName}`}>
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" className="event-map-tiles" />
    {event.latitude != null && event.longitude != null && <Marker position={position} title={event.locationName} icon={divIcon({ className: 'event-map-marker-wrap', html: `<span class="event-map-marker" role="img" aria-label="${getEventEmoji(event.categoryNames)} event"><span>${getEventEmoji(event.categoryNames)}</span></span>`, iconSize: [46, 50], iconAnchor: [23, 45], popupAnchor: [0, -42] })}><Popup><div className="min-w-44"><p className="font-semibold">{event.locationName}</p><p className="mt-2 text-xs text-brand-800">{event.participantCount} interested or going</p></div></Popup></Marker>}
    <MapCamera center={{ latitude: position[0], longitude: position[1] }} zoom={14} />
    {event.latitude == null || event.longitude == null ? <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-stone-600 shadow">Approximate city view · exact pin not available yet</div> : null}
  </MapContainer>
}

function MapResults({ events, center, zoom, city }: { events: EventSummary[]; center: Coordinates; zoom: number; city: string }) {
  return <MapContainer center={cityCenters[city] ?? cityCenters.Toronto} zoom={12} scrollWheelZoom attributionControl={false} className="h-full min-h-[420px] w-full rounded-2xl sm:min-h-[540px]" aria-label={`Interactive map of ${city} events`}>
    <MapCamera center={center} zoom={zoom} />
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      className="event-map-tiles"
    />
    {events.map((event) => event.latitude != null && event.longitude != null && <Marker key={event.id} position={[event.latitude, event.longitude]} title={event.title} icon={divIcon({ className: 'event-map-marker-wrap', html: `<span class="event-map-marker" role="img" aria-label="${getEventEmoji(event.categoryNames)} event"><span>${getEventEmoji(event.categoryNames)}</span></span>`, iconSize: [46, 50], iconAnchor: [23, 45], popupAnchor: [0, -42] })}>
      <Popup><div className="min-w-44"><p className="font-semibold">{event.title}</p><p className="mt-1 text-xs text-stone-600">{event.locationName}</p><p className="mt-1 text-xs text-stone-500">{new Date(event.startsAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</p><p className="mt-2 flex items-center gap-1.5 rounded-lg bg-brand-50 px-2 py-1.5 text-xs font-semibold text-brand-800"><span aria-hidden="true">👋</span>{event.participantCount} interested or going</p><Link className="mt-2 inline-block text-xs font-semibold text-brand-700" to={`/events/${event.id}`}>View event →</Link></div></Popup>
    </Marker>)}
  </MapContainer>
}

export function EventsMap({ events, city }: { events: EventSummary[]; city: string }) {
  const [placeQuery, setPlaceQuery] = useState('')
  const [center, setCenter] = useState<Coordinates>(() => {
    const [latitude, longitude] = cityCenters[city] ?? cityCenters.Toronto
    return { latitude, longitude }
  })
  const [zoom, setZoom] = useState(12)
  const [placeMessage, setPlaceMessage] = useState('Search for a place or address to move the map.')
  const [searching, setSearching] = useState(false)
  const requestInProgress = useRef(false)

  useEffect(() => {
    const [latitude, longitude] = cityCenters[city] ?? cityCenters.Toronto
    setCenter({ latitude, longitude })
    setZoom(12)
    setPlaceMessage(`Showing ${city}. Search for a place or address to move the map.`)
  }, [city])

  async function searchPlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = placeQuery.trim()
    if (!query || requestInProgress.current) return
    const cacheKey = query.toLocaleLowerCase()
    const cached = placeCache.get(cacheKey)
    if (cached) {
      setCenter(cached)
      setZoom(15)
      setPlaceMessage(`Map centered on ${cached.label}`)
      return
    }

    requestInProgress.current = true
    setSearching(true)
    setPlaceMessage('Looking up that place…')
    try {
      // Nominatim's public service is only used after an explicit user search,
      // never for autocomplete. Keep requests at or below one per second.
      const wait = Math.max(0, 1000 - (Date.now() - lastPlaceSearchAt))
      if (wait) await new Promise((resolve) => window.setTimeout(resolve, wait))
      lastPlaceSearchAt = Date.now()
      const params = new URLSearchParams({ q: `${query}, Canada`, format: 'jsonv2', limit: '1', countrycodes: 'ca' })
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
      if (!response.ok) throw new Error('Place search is temporarily unavailable.')
      const results = await response.json() as Array<{ lat: string; lon: string; display_name: string }>
      const result = results[0]
      if (!result) {
        setPlaceMessage('No place found. Try a nearby street, landmark, or neighbourhood.')
        return
      }
      const place: PlaceResult = { latitude: Number(result.lat), longitude: Number(result.lon), label: result.display_name.split(',').slice(0, 2).join(',') }
      placeCache.set(cacheKey, place)
      setCenter(place)
      setZoom(15)
      setPlaceMessage(`Map centered on ${place.label}`)
    } catch (error) {
      setPlaceMessage(error instanceof Error ? error.message : 'Could not search for that place right now.')
    } finally {
      requestInProgress.current = false
      setSearching(false)
    }
  }

  const mappableEvents = events.filter((event) => event.latitude != null && event.longitude != null)
  const missingCoordinates = events.length - mappableEvents.length

  return <div className="space-y-3">
    <form className="flex gap-2" onSubmit={searchPlace} role="search" aria-label="Search map locations">
      <label className="relative block min-w-0 flex-1"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><Input aria-label="Search a map place or address" placeholder="Search a place or address…" className="h-11 pl-10" value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} /></label>
      <Button type="submit" className="h-11" disabled={!placeQuery.trim() || searching}><MapPin size={15} />{searching ? 'Searching…' : 'Search map'}</Button>
    </form>
    <p role="status" className="text-xs text-stone-500">{placeMessage}</p>
    <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
      <div className="overflow-hidden rounded-2xl border border-stone-200 shadow-sm"><MapResults events={mappableEvents} center={center} zoom={zoom} city={city} /></div>
      <aside className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"><h3 className="font-bold text-stone-900">Events in {city} <span className="text-sm font-medium text-stone-400">({mappableEvents.length})</span></h3>{missingCoordinates > 0 && <p className="mt-2 text-xs text-amber-700">{missingCoordinates} event{missingCoordinates === 1 ? '' : 's'} need coordinates before they can appear here.</p>}{mappableEvents.length === 0 && <p className="mt-3 text-sm text-stone-500">No mapped events in {city} yet.</p>}<div className="mt-3 divide-y divide-stone-100">{mappableEvents.map((event) => <button type="button" key={event.id} onClick={() => { setCenter({ latitude: event.latitude!, longitude: event.longitude! }); setZoom(16) }} className="flex w-full gap-3 py-3 text-left hover:text-brand-700"><span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><span aria-hidden="true">{getEventEmoji(event.categoryNames)}</span></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-stone-800">{event.title}</span><span className="mt-1 block truncate text-xs text-stone-500">{event.locationName}</span><span className="mt-1 block text-[10px] text-stone-400">{new Date(event.startsAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span></span><span className="shrink-0 self-center rounded-full bg-brand-50 px-2 py-1 text-[10px] font-bold text-brand-800">{event.participantCount} interested/going</span></button>)}</div></aside>
    </div>
    <p className="text-[11px] text-stone-400">Map tiles © <a className="underline hover:text-brand-700" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></p>
  </div>
}

export function EventMapPreview({ event }: { event: EventSummary }) {
  return <MapAtEvent event={event} />
}
