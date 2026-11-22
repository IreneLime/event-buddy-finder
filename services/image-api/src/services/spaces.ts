import {
  DigitalOceanSpacesStorage,
  type ObjectStorage,
} from '@event-buddy/storage'

import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

let storage: ObjectStorage | undefined

export function getObjectStorage(): ObjectStorage {
  if (storage) return storage
  const values = {
    endpoint: env.spacesEndpoint,
    region: env.spacesRegion,
    bucket: env.spacesBucket,
    accessKeyId: env.spacesAccessKeyId,
    secretAccessKey: env.spacesSecretAccessKey,
  }
  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([name]) => name)
  if (missing.length > 0) {
    throw new ApiError(503, 'DigitalOcean Spaces is not configured', { missing })
  }

  storage = new DigitalOceanSpacesStorage({
    endpoint: values.endpoint!,
    region: values.region!,
    bucket: values.bucket!,
    accessKeyId: values.accessKeyId!,
    secretAccessKey: values.secretAccessKey!,
    forcePathStyle: env.spacesForcePathStyle,
    downloadUrlExpiresInSeconds: env.spacesDownloadUrlExpiresInSeconds,
  })
  return storage
}
