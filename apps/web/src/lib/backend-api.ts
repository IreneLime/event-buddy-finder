import type { CreateProfileRequest, CurrentUserProfile, EventSummary, ImageResponse, ParticipationStatus, UpdateProfileRequest, UserEventHistoryResponse, UserProfile } from '@event-buddy/contracts'

export const eventsApiUrl = import.meta.env.VITE_EVENTS_API_URL?.replace(/\/$/, '')
const usersApiUrl = import.meta.env.VITE_USERS_API_URL?.replace(/\/$/, '') ?? (import.meta.env.DEV ? 'http://localhost:4004' : '')
const imagesApiUrl = import.meta.env.VITE_IMAGE_API_URL?.replace(/\/$/, '') ?? (import.meta.env.DEV ? 'http://localhost:4005' : '')

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

interface RequestOptions {
  token?: string
  signal?: AbortSignal
  method?: string
  body?: object
}

async function request<T>(origin: string, path: string, { token, signal, method = 'GET', body }: RequestOptions = {}): Promise<T> {
  const form = body instanceof FormData
  let response: Response
  try {
    response = await fetch(origin + path, {
      method, signal,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body && !form ? { 'Content-Type': 'application/json' } : {}),
      },
      body: form ? body : body ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('Could not reach the service. Please try again.')
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const fields = payload?.details?.fieldErrors
    const fieldMessage = fields && Object.values(fields).flat().filter(Boolean).join(' ')
    const missingCategories = payload?.details?.missingCategories
    const message = Array.isArray(missingCategories) ? `Unknown categories: ${missingCategories.join(', ')}.` : fieldMessage || payload?.error || payload?.message
    throw new ApiError(response.status, typeof message === 'string' ? message : `Request failed (${response.status}).`)
  }
  return response.status === 204 ? undefined as T : response.json()
}

const profilePath = (id: string) => `/users/${encodeURIComponent(id)}`
const eventPath = (id: string) => `/events/${encodeURIComponent(id)}`

export const profileApi = {
  get: async (id: string, signal?: AbortSignal): Promise<UserProfile> => {
    try {
      return await request<UserProfile>(usersApiUrl, profilePath(id), { signal })
    } catch (error) {
      if (error instanceof ApiError && error.status === 404 && !id.startsWith('demo-')) {
        try {
          return await request<UserProfile>(usersApiUrl, profilePath(`demo-${id}`), { signal })
        } catch (aliasError) {
          if (!(aliasError instanceof ApiError && aliasError.status === 404)) throw aliasError
        }
      }
      if (error instanceof Error && error.message === 'Could not reach the service. Please try again.') {
        throw new Error('Could not reach the user profile service. Start it with `pnpm dev:users`, then try again.')
      }
      throw error
    }
  },
  mine: (token: string, signal?: AbortSignal) => request<CurrentUserProfile>(usersApiUrl, '/me/profile', { token, signal }),
  save: (token: string, body: CreateProfileRequest | UpdateProfileRequest, create: boolean) =>
    request<CurrentUserProfile>(usersApiUrl, '/me/profile', { token, method: create ? 'POST' : 'PATCH', body }),
  history: (id: string, page: number, signal?: AbortSignal) =>
    request<UserEventHistoryResponse>(usersApiUrl, `${profilePath(id)}/events?page=${page}`, { signal }),
}

type EventFields = Pick<EventSummary, 'title' | 'description' | 'startsAt' | 'endsAt' | 'locationName' | 'city' | 'latitude' | 'longitude' | 'categoryNames' | 'priceAmount'> & {
  address?: string | null
  notes?: string | null
}

function eventRequest<T>(path: string, options?: RequestOptions) {
  if (!eventsApiUrl) throw new Error('The events API is not configured.')
  return request<T>(eventsApiUrl, path, options)
}

interface EventPage {
  items: EventSummary[]
  total: number
}

async function listEvents(path: string, token?: string, signal?: AbortSignal) {
  const items = new Map<string, EventSummary>()
  const separator = path.includes('?') ? '&' : '?'
  const limit = 100
  for (let page = 1; ; page += 1) {
    const result = await eventRequest<EventPage>(`${path}${separator}page=${page}&limit=${limit}`, { token, signal })
    for (const event of result.items) items.set(event.id, event)
    if (!result.items.length || page * limit >= result.total) return [...items.values()]
  }
}

export const eventApi = {
  list: (token?: string, signal?: AbortSignal) => listEvents('/events?status=scheduled', token, signal),
  hosted: (token: string, signal?: AbortSignal) => listEvents('/me/events?role=hosted', token, signal),
  interested: (token: string, signal?: AbortSignal) => listEvents('/me/events?role=attending&status=interested', token, signal),
  categories: async (signal?: AbortSignal) => {
    const result = await eventRequest<{ items: { id: string; name: string }[] }>('/categories', { signal })
    return result.items.map(({ name }) => name)
  },
  get: (id: string, token?: string, signal?: AbortSignal) => eventRequest<EventSummary>(eventPath(id), { token, signal }),
  save: (fields: EventFields, token: string, id?: string) =>
    eventRequest<EventSummary>(id ? eventPath(id) : '/events', { token, method: id ? 'PATCH' : 'POST', body: fields }),
  cancel: (id: string, token: string) => eventRequest<EventSummary>(eventPath(id), { token, method: 'DELETE' }),
  participate: (id: string, status: ParticipationStatus, token: string) =>
    eventRequest<EventSummary>(`${eventPath(id)}/participation`, { token, method: 'PUT', body: { status } }),
  participants: (id: string, signal?: AbortSignal) =>
    eventRequest<{ total: number; items: { userId: string; displayName: string }[] }>(`${eventPath(id)}/participants?limit=6`, { signal }),
}

export function imagePath(kind: 'profile' | 'event', id: string) {
  return `${kind === 'profile' ? profilePath(id) : eventPath(id)}/image`
}

export const imageApi = {
  get: (path: string, signal?: AbortSignal) => request<ImageResponse>(imagesApiUrl, path, { signal }),
  upload: (path: string, file: File, token: string) => {
    const body = new FormData()
    body.set('image', file)
    return request<ImageResponse>(imagesApiUrl, path, { method: 'POST', token, body })
  },
  remove: (path: string, token: string) => request<void>(imagesApiUrl, path, { method: 'DELETE', token }),
}
