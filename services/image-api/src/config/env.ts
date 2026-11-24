import { loadEnvFile } from 'node:process'
import { fileURLToPath } from 'node:url'

try {
  loadEnvFile(fileURLToPath(new URL('../../../../.env', import.meta.url)))
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}

export const env = {
  port: Number(process.env.PORT ?? 4005),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  authApiUrl: (process.env.AUTH_API_URL ?? 'http://localhost:4003').replace(/\/$/, ''),
  authApiTimeoutMs: Number(process.env.AUTH_API_TIMEOUT_MS ?? 5_000),
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/event_buddy_finder',
  spacesEndpoint: process.env.SPACES_ENDPOINT,
  spacesRegion: process.env.SPACES_REGION ?? 'us-east-1',
  spacesForcePathStyle: process.env.SPACES_FORCE_PATH_STYLE === 'true',
  spacesBucket: process.env.SPACES_BUCKET,
  spacesAccessKeyId: process.env.SPACES_ACCESS_KEY_ID,
  spacesSecretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY,
  spacesDownloadUrlExpiresInSeconds: Number(
    process.env.SPACES_DOWNLOAD_URL_EXPIRES_IN_SECONDS ?? 900,
  ),
}
