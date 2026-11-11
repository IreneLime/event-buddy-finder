import type {
  EventParticipant,
  EventParticipantsResponse,
  EventSummary,
  ParticipationStatus,
} from '@event-buddy/contracts'

import { ApiError } from '../../utils/ApiError.js'
import * as eventRepository from '../events/event.repository.js'
import { getEvent } from '../events/event.service.js'
import * as participationRepository from './participation.repository.js'
import type { ParticipantsQuery } from './participation.validation.js'

export async function setParticipation(
  eventId: string,
  userId: string,
  status: ParticipationStatus,
): Promise<EventSummary> {
  const event = await eventRepository.getEventOwnership(eventId)
  if (!event) {
    throw new ApiError(404, 'Event not found')
  }
  if (event.status === 'cancelled') {
    throw new ApiError(400, 'Cannot change participation on a cancelled event')
  }

  const userExists = await eventRepository.userExists(userId)
  if (!userExists) {
    throw new ApiError(400, 'User profile does not exist')
  }

  if (status === 'going' && event.capacity !== null) {
    const current = await participationRepository.getParticipation(eventId, userId)
    if (current?.status !== 'going') {
      const goingCount = await participationRepository.countGoing(eventId)
      if (goingCount >= event.capacity) {
        throw new ApiError(409, 'Event is at capacity')
      }
    }
  }

  await participationRepository.upsertParticipation(eventId, userId, status)
  return getEvent(eventId, userId)
}

export async function listParticipants(
  eventId: string,
  query: ParticipantsQuery,
): Promise<EventParticipantsResponse | { eventId: string; total: number }> {
  const event = await eventRepository.getEventOwnership(eventId)
  if (!event) {
    throw new ApiError(404, 'Event not found')
  }

  const { rows, total } = await participationRepository.listParticipants(eventId, {
    status: query.status,
    page: query.page,
    limit: query.limit,
  })

  if (query.countOnly) {
    return { eventId, total }
  }

  const items: EventParticipant[] = rows.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    status: row.status,
    ...(row.profile_image_key ? { profileImageUrl: row.profile_image_key } : {}),
  }))

  return {
    eventId,
    total,
    items,
  }
}
