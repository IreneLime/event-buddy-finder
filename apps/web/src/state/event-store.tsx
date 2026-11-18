import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { EventSummary, ParticipationStatus } from '@event-buddy/contracts'
import { starterEvents, eventCategories } from '../data/mock-events'
import { ApiError, eventApi, eventsApiUrl } from '../lib/backend-api'
import { useApiResource } from '../lib/use-api-resource'
import { useAuth } from './auth-store'

const noEvents: EventSummary[] = []

function useEventStoreValue() {
  const { user, loading: authLoading, live: liveAuth, getToken } = useAuth()
  const userId = user?.id
  const live = Boolean(eventsApiUrl)
  const [demoEvents, setDemoEvents] = useState(starterEvents)
  const [detailRevision, setDetailRevision] = useState(0)
  const readToken = useCallback(async () => {
    if (!userId) return undefined
    return await getToken() ?? (!liveAuth && import.meta.env.DEV ? 'dev:demo-' + userId : undefined)
  }, [getToken, liveAuth, userId])
  const load = useCallback(async (signal: AbortSignal) => eventApi.list(await readToken(), signal), [readToken])
  const list = useApiResource(live && !authLoading ? load : null)
  const hostedLoad = useCallback(async (signal: AbortSignal) => {
    if (!userId) return []
    const token = await readToken()
    return token ? eventApi.hosted(token, signal) : []
  }, [readToken, userId])
  const hosted = useApiResource(live && userId ? hostedLoad : null)
  const categories = useApiResource(live ? eventApi.categories : null)

  async function writeToken() {
    if (liveAuth && !user?.emailVerified) throw new Error('Verify your email before making changes.')
    if (liveAuth && !live) throw new Error('The events API is not configured.')
    const token = await readToken()
    if (!token) throw new Error('Sign in with Firebase to make changes.')
    return token
  }

  async function saveEvent(event: EventSummary, id?: string) {
    if (!live && !liveAuth) {
      setDemoEvents((current) => id ? current.map((item) => item.id === id ? event : item) : [event, ...current])
      return event
    }
    const token = await writeToken()
    const { title, description, startsAt, endsAt, locationName, city, address, latitude, longitude, categoryNames, priceAmount, notes } = event
    const saved = await eventApi.save({
      title, description, startsAt, endsAt, locationName, city, latitude, longitude, categoryNames, priceAmount,
      address: address?.trim() || (id ? null : undefined),
      notes: notes?.trim() || (id ? null : undefined),
    }, token, id)
    list.retry()
    hosted.retry()
    return saved
  }

  async function setParticipation(id: string, status: ParticipationStatus | undefined) {
    if (live || liveAuth) {
      const updated = await eventApi.participate(id, status ?? 'withdrawn', await writeToken())
      list.retry()
      return updated
    }
    const event = demoEvents.find((item) => item.id === id)
    if (!event) throw new Error('Event not found.')
    const participantCount = event.participantCount - Number(['going', 'interested'].includes(event.viewerParticipation ?? '')) + Number(status === 'going' || status === 'interested')
    const updated = { ...event, viewerParticipation: status, participantCount: Math.max(0, participantCount) }
    setDemoEvents((current) => current.map((item) => item.id === event.id ? updated : item))
    return updated
  }

  async function cancelEvent(id: string) {
    const event = await eventApi.cancel(id, await writeToken())
    list.retry()
    hosted.retry()
    return event
  }

  const retry = list.retry
  const refresh = useCallback(() => {
    retry()
    setDetailRevision((revision) => revision + 1)
  }, [retry])
  const events = live ? list.data ?? noEvents : demoEvents

  return {
    live, events, refresh, detailRevision, readToken,
    getEvent: (id: string) => events.find((event) => event.id === id), loading: live && (authLoading || list.loading),
    error: list.error, retry: list.retry, saveEvent, setParticipation, cancelEvent,
    canEdit: (event: EventSummary) => live ? Boolean(userId && (event.organizerUserId === (liveAuth ? userId : 'demo-' + userId) || hosted.data?.some(({ id }) => id === event.id))) : Boolean(!liveAuth && user && event.organizerName === user.displayName),
    categories: live ? categories.data ?? [] : eventCategories.slice(1),
    categoriesLoading: categories.loading, categoriesError: categories.error, retryCategories: categories.retry,
  }
}

const EventStoreContext = createContext<ReturnType<typeof useEventStoreValue> | null>(null)

export function EventStoreProvider({ children }: { children: ReactNode }) {
  const value = useEventStoreValue()
  return <EventStoreContext.Provider value={value}>{children}</EventStoreContext.Provider>
}

export function useEventStore() {
  const value = useContext(EventStoreContext)
  if (!value) throw new Error('useEventStore must be used inside EventStoreProvider')
  return value
}

export function useEventDetails(id: string | undefined) {
  const { live, events, readToken, detailRevision } = useEventStore()
  const { loading } = useAuth()
  const load = useCallback(async (signal: AbortSignal) => {
    if (!id) return undefined
    try { return await eventApi.get(id, await readToken(), signal) }
    catch (error) {
      if (error instanceof ApiError && error.status === 404) return undefined
      throw error
    }
  }, [id, readToken])
  const detail = useApiResource(live && id && !loading ? load : null, detailRevision)
  return {
    event: live ? detail.data : events.find((event) => event.id === id),
    loading: Boolean(live && id && (loading || detail.loading)), error: detail.error, retry: detail.retry,
  }
}
