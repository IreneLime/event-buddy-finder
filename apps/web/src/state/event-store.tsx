import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { EventSummary, ParticipationStatus } from '@event-buddy/contracts'
import { starterEvents } from '../data/mock-events'

interface EventStoreValue {
  events: EventSummary[]
  getEvent: (eventId: string) => EventSummary | undefined
  saveEvent: (event: EventSummary) => void
  setParticipation: (eventId: string, status: ParticipationStatus | undefined) => void
}

const EventStoreContext = createContext<EventStoreValue | null>(null)

export function EventStoreProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState(starterEvents)

  const value = useMemo<EventStoreValue>(() => ({
    events,
    getEvent: (eventId) => events.find((event) => event.id === eventId),
    saveEvent: (event) => setEvents((current) => {
      const exists = current.some((item) => item.id === event.id)
      return exists ? current.map((item) => item.id === event.id ? event : item) : [event, ...current]
    }),
    setParticipation: (eventId, status) => setEvents((current) => current.map((event) => {
      if (event.id !== eventId) return event
      const participantCount = event.participantCount + (event.viewerParticipation === 'going' ? -1 : 0) + (status === 'going' ? 1 : 0)
      return { ...event, viewerParticipation: status, participantCount: Math.max(0, participantCount) }
    })),
  }), [events])

  return <EventStoreContext.Provider value={value}>{children}</EventStoreContext.Provider>
}

export function useEventStore() {
  const value = useContext(EventStoreContext)
  if (!value) throw new Error('useEventStore must be used inside EventStoreProvider')
  return value
}
