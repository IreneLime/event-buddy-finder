import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { CreateEventRequest, EventSummary, ParticipationStatus } from '@event-buddy/contracts'
import { createEventsApi } from '../lib/events-api'
import { useAuth } from './auth-store'

interface EventStoreValue {
  events: EventSummary[]
  loading: boolean
  error: string
  refresh: () => Promise<void>
  getEvent: (eventId: string) => EventSummary | undefined
  saveEvent: (event: EventSummary) => Promise<EventSummary>
  cancelEvent: (eventId: string) => Promise<EventSummary>
  setParticipation: (eventId: string, status: ParticipationStatus | undefined) => Promise<EventSummary>
}

const EventStoreContext = createContext<EventStoreValue | null>(null)

export function EventStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id
  const api = useMemo(() => createEventsApi(userId), [userId])
  const [data, setData] = useState<{ userId: string | undefined; events: EventSummary[] }>({ userId, events: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const generation = useRef(0)
  const events = data.userId === userId ? data.events : []

  const refresh = useCallback(async () => {
    const request = ++generation.current
    try {
      const events = await api.list()
      if (request === generation.current) { setData({ userId, events }); setError('') }
    } catch (error) {
      if (request === generation.current) setError(error instanceof Error ? error.message : 'Cannot load events.')
    } finally { if (request === generation.current) setLoading(false) }
  }, [api, userId])

  useEffect(() => {
    setLoading(true)
    setData({ userId, events: [] })
    void refresh()
    return () => { generation.current += 1 }
  }, [refresh])

  const value = useMemo<EventStoreValue>(() => {
    const remember = (event: EventSummary) => {
      setData((current) => current.userId === userId ? { userId, events: [event, ...current.events.filter((item) => item.id !== event.id)] } : current)
      return event
    }
    return {
      events, loading: loading || data.userId !== userId, error, refresh,
      getEvent: (id) => events.find((event) => event.id === id),
      saveEvent: async (event) => {
        const body: CreateEventRequest = {
          title: event.title, description: event.description, notes: event.notes, city: event.city,
          startsAt: event.startsAt, endsAt: event.endsAt, locationName: event.locationName,
          address: event.address, latitude: event.latitude, longitude: event.longitude,
          categoryNames: event.categoryNames, priceAmount: event.priceAmount, capacity: event.capacity,
        }
        return remember(events.some((item) => item.id === event.id) ? await api.update(event.id, { ...body, endsAt: event.endsAt ?? null }) : await api.create(body))
      },
      cancelEvent: async (id) => remember(await api.cancel(id)),
      setParticipation: async (id, status) => remember(await api.participate(id, status ?? 'withdrawn')),
    }
  }, [api, data.userId, error, events, loading, refresh, userId])

  return <EventStoreContext.Provider value={value}>{children}</EventStoreContext.Provider>
}

export function useEventStore() {
  const value = useContext(EventStoreContext)
  if (!value) throw new Error('useEventStore must be used inside EventStoreProvider')
  return value
}
