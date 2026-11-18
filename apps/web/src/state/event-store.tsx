import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { EventSummary, ParticipationStatus } from '@event-buddy/contracts'
import { starterEvents, eventCategories } from '../data/mock-events'
import { ApiError, eventApi, eventsApiUrl } from '../lib/backend-api'
import { useApiResource } from '../lib/use-api-resource'
import { useAuth } from './auth-store'

function useEventStoreValue() {
  const { user, loading: authLoading, live: liveAuth, getToken } = useAuth()
  const userId = user?.id
  const live = Boolean(eventsApiUrl)
  const [demoEvents, setDemoEvents] = useState(starterEvents)
  const load = useCallback(async (signal: AbortSignal) => eventApi.list(userId ? await getToken() : undefined, signal), [getToken, userId])
  const list = useApiResource(live && !authLoading ? load : null)
  const hostedLoad = useCallback(async (signal: AbortSignal) => {
    if (!userId) return []
    const token = await getToken()
    return token ? eventApi.hosted(token, signal) : []
  }, [getToken, userId])
  const hosted = useApiResource(live && userId && liveAuth ? hostedLoad : null)
  const categories = useApiResource(live ? eventApi.categories : null)

  async function writeToken() {
    if (liveAuth && !user?.emailVerified) throw new Error('Verify your email before making changes.')
    if (liveAuth && !live) throw new Error('The events API is not configured.')
    const token = await getToken()
    if (!token) throw new Error('Sign in with Firebase to make changes.')
    return token
  }

  async function saveEvent(event: EventSummary, id?: string) {
    if (!live && !liveAuth) {
      setDemoEvents((current) => id ? current.map((item) => item.id === id ? event : item) : [event, ...current])
      return event
    }
    const token = await writeToken()
    const { title, description, startsAt, locationName, city, address, latitude, longitude, categoryNames, priceAmount, notes } = event
    const saved = await eventApi.save({
      title, description, startsAt, locationName, city, latitude, longitude, categoryNames, priceAmount,
      address: address?.trim() || (id ? null : undefined),
      notes: notes?.trim() || (id ? null : undefined),
    }, token, id)
    list.retry()
    hosted.retry()
    return saved
  }

  async function setParticipation(event: EventSummary, status: ParticipationStatus | undefined) {
    if (live || liveAuth) {
      const updated = await eventApi.participate(event.id, status ?? 'withdrawn', await writeToken())
      list.retry()
      return updated
    }
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

  return {
    live, events: live ? list.data ?? [] : demoEvents, loading: live && (authLoading || list.loading),
    error: list.error, retry: list.retry, saveEvent, setParticipation, cancelEvent,
    canEdit: (event: EventSummary) => live ? Boolean(hosted.data?.some(({ id }) => id === event.id)) : Boolean(!liveAuth && user && event.organizerName === user.displayName),
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
  const { live, events } = useEventStore()
  const { getToken, loading, user } = useAuth()
  const userId = user?.id
  const load = useCallback(async (signal: AbortSignal) => {
    try { return await eventApi.get(id!, userId ? await getToken() : undefined, signal) }
    catch (error) {
      if (error instanceof ApiError && error.status === 404) return undefined
      throw error
    }
  }, [id, userId, getToken])
  const detail = useApiResource(live && id && !loading ? load : null)
  return {
    event: live ? detail.data : events.find((event) => event.id === id),
    loading: Boolean(live && id && (loading || detail.loading)), error: detail.error, retry: detail.retry,
  }
}
