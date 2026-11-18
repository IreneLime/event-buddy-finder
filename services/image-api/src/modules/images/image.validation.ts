import { fileTypeFromBuffer } from 'file-type'
import { z } from 'zod'

import { ApiError } from '../../utils/ApiError.js'

const allowedImages = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

export const eventIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Event id must be a positive integer'),
})

export const userIdParamSchema = z.object({
  id: z.string().trim().min(1).max(128),
})

export async function validateImage(buffer: Buffer) {
  const detected = await fileTypeFromBuffer(buffer)
  const extension = detected ? allowedImages.get(detected.mime) : undefined
  if (!detected || !extension) {
    throw new ApiError(400, 'Only JPEG, PNG, and WebP images are supported')
  }
  return { contentType: detected.mime, extension }
}
