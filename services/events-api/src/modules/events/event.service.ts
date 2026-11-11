import type { EventSummary, PaginatedEvents } from '@event-buddy/contracts'

import { ApiError } from '../../utils/ApiError.js'
import { mapEventRow } from './event.mapper.js'
import * as eventRepository from './event.repository.js'
import type {
  CreateEventBody,
  EventListQueryInput,
  UpdateEventBody,
} from './event.validation.js'

async function assertCanManageEvent(eventId: string, userId: string) {
  const event = await eventRepository.getEventOwnership(eventId)
  if (!event) {
    throw new ApiError(404, 'Event not found')
  }

  if (event.created_by_user_id === userId) {
    return event
  }

  if (event.organizing_group_id) {
    const isOrganizer = await eventRepository.isGroupOrganizer(event.organizing_group_id, userId)
    if (isOrganizer) {
      return event
    }
  }

  throw new ApiError(403, 'You do not have permission to manage this event')
}

export async function listEvents(
  viewerUserId: string | undefined,
  query: EventListQueryInput,
): Promise<PaginatedEvents> {
  const { rows, total } = await eventRepository.listEvents(viewerUserId, query)
  return {
    items: rows.map(mapEventRow),
    page: query.page,
    limit: query.limit,
    total,
  }
}

export async function getEvent(
  eventId: string,
  viewerUserId: string | undefined,
): Promise<EventSummary> {
  const row = await eventRepository.getEventById(eventId, viewerUserId)
  if (!row) {
    throw new ApiError(404, 'Event not found')
  }
  return mapEventRow(row)
}

export async function createEvent(userId: string, body: CreateEventBody): Promise<EventSummary> {
  const exists = await eventRepository.userExists(userId)
  if (!exists) {
    throw new ApiError(400, 'User profile does not exist. Complete profile setup before creating events.')
  }

  if (body.organizingGroupId) {
    const isOrganizer = await eventRepository.isGroupOrganizer(body.organizingGroupId, userId)
    if (!isOrganizer) {
      throw new ApiError(403, 'You must be a group organizer to create an event for that group')
    }
  }

  try {
    const eventId = await eventRepository.createEvent(userId, body)
    return getEvent(eventId, userId)
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'missingCategories' in error &&
      Array.isArray((error as { missingCategories: unknown }).missingCategories)
    ) {
      throw new ApiError(400, 'One or more categories are invalid', {
        missingCategories: (error as { missingCategories: string[] }).missingCategories,
      })
    }
    throw error
  }
}

export async function updateEvent(
  eventId: string,
  userId: string,
  body: UpdateEventBody,
): Promise<EventSummary> {
  const ownership = await assertCanManageEvent(eventId, userId)
  if (ownership.status === 'cancelled') {
    throw new ApiError(400, 'Cancelled events cannot be updated')
  }

  if (body.organizingGroupId) {
    const isOrganizer = await eventRepository.isGroupOrganizer(body.organizingGroupId, userId)
    if (!isOrganizer) {
      throw new ApiError(403, 'You must be a group organizer to assign that group')
    }
  }

  if (body.startsAt || body.endsAt !== undefined) {
    const startsAt = body.startsAt ?? ownership.starts_at.toISOString()
    const endsAt =
      body.endsAt === undefined
        ? ownership.ends_at?.toISOString() ?? null
        : body.endsAt
    if (endsAt && endsAt <= startsAt) {
      throw new ApiError(400, 'endsAt must be after startsAt')
    }
  }

  try {
    await eventRepository.updateEvent(eventId, body)
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'missingCategories' in error &&
      Array.isArray((error as { missingCategories: unknown }).missingCategories)
    ) {
      throw new ApiError(400, 'One or more categories are invalid', {
        missingCategories: (error as { missingCategories: string[] }).missingCategories,
      })
    }
    throw error
  }

  return getEvent(eventId, userId)
}

export async function cancelEvent(eventId: string, userId: string): Promise<EventSummary> {
  const ownership = await assertCanManageEvent(eventId, userId)
  if (ownership.status === 'cancelled') {
    throw new ApiError(400, 'Event is already cancelled')
  }

  await eventRepository.cancelEvent(eventId)
  return getEvent(eventId, userId)
}

export async function listCategories(): Promise<{ id: string; name: string }[]> {
  return eventRepository.listCategories()
}

export async function listMyEvents(
  userId: string,
  options: {
    role?: 'hosted' | 'attending'
    status?: 'interested' | 'going' | 'withdrawn'
    page: number
    limit: number
  },
): Promise<PaginatedEvents> {
  const { rows, total } = await eventRepository.listMyEvents(userId, options)
  return {
    items: rows.map(mapEventRow),
    page: options.page,
    limit: options.limit,
    total,
  }
}
