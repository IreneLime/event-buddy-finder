import type { CreateEventRequest, EventSummary, PaginatedEvents, ParticipationStatus, UpdateEventRequest } from '@event-buddy/contracts'
import { apiIdentity } from './api-identity'

const origin = (import.meta.env.VITE_EVENTS_API_URL ?? (import.meta.env.DEV ? 'http://localhost:4001' : window.location.origin)).replace(/\/$/, '')

export function createEventsApi(userId: string | undefined) {
  async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const { token, demoUserId } = await apiIdentity(userId)
    const response = await fetch(`${origin}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : demoUserId ? { Authorization: `Bearer dev:demo-${demoUserId}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'The event service is unavailable.' }))
      throw new Error(error.error ?? 'The event request failed.')
    }
    return response.json()
  }
  const path = (id: string) => `/events/${encodeURIComponent(id)}`
  return {
    async list() {
      const events: EventSummary[] = []
      for (const status of ['scheduled', 'cancelled']) {
        let page = 1
        let result: PaginatedEvents
        do {
          result = await request<PaginatedEvents>(`/events?status=${status}&limit=100&page=${page++}`)
          events.push(...result.items)
        } while ((page - 1) * result.limit < result.total)
      }
      return events
    },
    get: (id: string) => request<EventSummary>(path(id)),
    create: (body: CreateEventRequest) => request<EventSummary>('/events', 'POST', body),
    update: (id: string, body: UpdateEventRequest) => request<EventSummary>(path(id), 'PATCH', body),
    cancel: (id: string) => request<EventSummary>(path(id), 'DELETE'),
    participate: (id: string, status: ParticipationStatus) => request<EventSummary>(`${path(id)}/participation`, 'PUT', { status }),
  }
}
