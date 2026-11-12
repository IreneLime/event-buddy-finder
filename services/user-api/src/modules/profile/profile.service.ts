import type {
  CurrentUserProfile,
  ProfileValidationResponse,
  UserProfile,
} from '@event-buddy/contracts'

import { ApiError } from '../../utils/ApiError.js'
import { mapCurrentUserProfile, mapPublicProfile } from './profile.mapper.js'
import * as profileRepository from './profile.repository.js'
import type { CreateProfileBody, UpdateProfileBody } from './profile.validation.js'

function translateProfileError(error: unknown): never {
  if (
    error &&
    typeof error === 'object' &&
    'missingCategories' in error &&
    Array.isArray((error as { missingCategories: unknown }).missingCategories)
  ) {
    throw new ApiError(400, 'One or more preferred categories are invalid', {
      missingCategories: (error as { missingCategories: string[] }).missingCategories,
    })
  }
  if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
    throw new ApiError(409, 'A profile already exists for this user or email')
  }
  throw error
}

export async function getCurrentProfile(userId: string): Promise<CurrentUserProfile> {
  const profile = await profileRepository.getProfileById(userId)
  if (!profile) throw new ApiError(404, 'Profile not found')
  return mapCurrentUserProfile(profile)
}

export async function getPublicProfile(userId: string): Promise<UserProfile> {
  const profile = await profileRepository.getProfileById(userId)
  if (!profile) throw new ApiError(404, 'Profile not found')
  return mapPublicProfile(profile)
}

export async function createCurrentProfile(
  userId: string,
  email: string,
  body: CreateProfileBody,
): Promise<CurrentUserProfile> {
  try {
    return mapCurrentUserProfile(await profileRepository.createProfile(userId, email, body))
  } catch (error) {
    return translateProfileError(error)
  }
}

export async function updateCurrentProfile(
  userId: string,
  email: string,
  body: UpdateProfileBody,
): Promise<CurrentUserProfile> {
  try {
    const profile = await profileRepository.updateProfile(userId, email, body)
    if (!profile) throw new ApiError(404, 'Profile not found')
    return mapCurrentUserProfile(profile)
  } catch (error) {
    if (error instanceof ApiError) throw error
    return translateProfileError(error)
  }
}

export async function validateProfile(
  profile: CreateProfileBody,
): Promise<ProfileValidationResponse> {
  const missingCategories = await profileRepository.findMissingCategories(
    profile.preferredCategories,
  )
  if (missingCategories.length > 0) {
    throw new ApiError(400, 'One or more preferred categories are invalid', {
      missingCategories,
    })
  }
  return { valid: true, profile }
}
