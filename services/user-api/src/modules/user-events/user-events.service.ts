import type { UserEventHistoryResponse } from '@event-buddy/contracts'

import { ApiError } from '../../utils/ApiError.js'
import * as profileRepository from '../profile/profile.repository.js'
import { mapUserEvent } from './user-events.mapper.js'
import * as userEventsRepository from './user-events.repository.js'
import type { UserEventsQuery } from './user-events.validation.js'

export async function getEventsForUser(
  userId: string,
  query: UserEventsQuery,
): Promise<UserEventHistoryResponse> {
  if (!(await profileRepository.getProfileById(userId))) {
    throw new ApiError(404, 'Profile not found')
  }
  const { rows, total } = await userEventsRepository.listPastEventsForUser(userId, query)
  return {
    items: rows.map(mapUserEvent),
    page: query.page,
    limit: query.limit,
    total,
  }
}
