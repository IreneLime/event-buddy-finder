import { randomUUID } from 'node:crypto'

import type { ImageResponse } from '@event-buddy/contracts'
import type { ObjectStorage } from '@event-buddy/storage'

import { getObjectStorage } from '../../services/spaces.js'
import { ApiError } from '../../utils/ApiError.js'
import * as imageRepository from './image.repository.js'
import { validateImage } from './image.validation.js'

async function deleteWithoutFailing(storage: ObjectStorage, key: string): Promise<void> {
  try {
    await storage.delete(key)
  } catch (error) {
    console.error(`Could not delete image object ${key}`, error)
  }
}

async function deleteOwnedObjectWithoutFailing(
  storage: ObjectStorage,
  key: string,
  ownerPrefix: string,
): Promise<void> {
  if (!key.startsWith(`${ownerPrefix}/`)) {
    console.warn(`Skipped deletion of image object outside ${ownerPrefix}`)
    return
  }
  await deleteWithoutFailing(storage, key)
}

async function upload(
  prefix: string,
  file: Express.Multer.File,
  storage: ObjectStorage,
): Promise<{ key: string; imageUrl: string }> {
  const image = await validateImage(file.buffer)
  const key = `${prefix}/${randomUUID()}.${image.extension}`
  await storage.upload({
    key,
    body: file.buffer,
    contentType: image.contentType,
    cacheControl: 'private, max-age=3600',
  })
  return { key, imageUrl: await storage.createDownloadUrl(key) }
}

export async function uploadProfileImage(
  userId: string,
  file: Express.Multer.File,
  storage: ObjectStorage = getObjectStorage(),
): Promise<ImageResponse> {
  const ownerPrefix = `profile-images/${encodeURIComponent(userId)}`
  const uploaded = await upload(ownerPrefix, file, storage)
  let replaced: Awaited<ReturnType<typeof imageRepository.replaceProfileImageKey>>
  try {
    replaced = await imageRepository.replaceProfileImageKey(userId, uploaded.key)
    if (!replaced) throw new ApiError(404, 'Profile not found')
  } catch (error) {
    await deleteWithoutFailing(storage, uploaded.key)
    throw error
  }
  if (replaced.previousKey) {
    await deleteOwnedObjectWithoutFailing(storage, replaced.previousKey, ownerPrefix)
  }
  return { imageUrl: uploaded.imageUrl }
}

export async function deleteProfileImage(
  userId: string,
  storage: ObjectStorage = getObjectStorage(),
): Promise<void> {
  const ownerPrefix = `profile-images/${encodeURIComponent(userId)}`
  const replaced = await imageRepository.replaceProfileImageKey(userId, null)
  if (!replaced) throw new ApiError(404, 'Profile not found')
  if (replaced.previousKey) {
    await deleteOwnedObjectWithoutFailing(storage, replaced.previousKey, ownerPrefix)
  }
}

export async function getProfileImage(
  userId: string,
  storage: ObjectStorage = getObjectStorage(),
): Promise<ImageResponse> {
  const key = await imageRepository.getProfileImageKey(userId)
  if (!key) throw new ApiError(404, 'Profile image not found')
  return { imageUrl: await storage.createDownloadUrl(key) }
}

function assertEventResult(
  result: Awaited<ReturnType<typeof imageRepository.replaceEventImageKey>>,
): asserts result is { previousKey: string | null } {
  if (result === 'not_found') throw new ApiError(404, 'Event not found')
  if (result === 'forbidden') {
    throw new ApiError(403, 'You do not have permission to manage this event image')
  }
}

export async function uploadEventImage(
  eventId: string,
  userId: string,
  file: Express.Multer.File,
  storage: ObjectStorage = getObjectStorage(),
): Promise<ImageResponse> {
  const ownerPrefix = `event-images/${eventId}`
  const uploaded = await upload(ownerPrefix, file, storage)
  let replaced: Awaited<ReturnType<typeof imageRepository.replaceEventImageKey>>
  try {
    replaced = await imageRepository.replaceEventImageKey(eventId, userId, uploaded.key)
    assertEventResult(replaced)
  } catch (error) {
    await deleteWithoutFailing(storage, uploaded.key)
    throw error
  }
  if (replaced.previousKey) {
    await deleteOwnedObjectWithoutFailing(storage, replaced.previousKey, ownerPrefix)
  }
  return { imageUrl: uploaded.imageUrl }
}

export async function deleteEventImage(
  eventId: string,
  userId: string,
  storage: ObjectStorage = getObjectStorage(),
): Promise<void> {
  const ownerPrefix = `event-images/${eventId}`
  const replaced = await imageRepository.replaceEventImageKey(eventId, userId, null)
  assertEventResult(replaced)
  if (replaced.previousKey) {
    await deleteOwnedObjectWithoutFailing(storage, replaced.previousKey, ownerPrefix)
  }
}

export async function getEventImage(
  eventId: string,
  storage: ObjectStorage = getObjectStorage(),
): Promise<ImageResponse> {
  const key = await imageRepository.getEventImageKey(eventId)
  if (!key) throw new ApiError(404, 'Event image not found')
  return { imageUrl: await storage.createDownloadUrl(key) }
}
