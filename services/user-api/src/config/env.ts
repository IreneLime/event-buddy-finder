export const env = {
  port: Number(process.env.PORT ?? 4004),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  authApiUrl: (process.env.AUTH_API_URL ?? 'http://localhost:4003').replace(/\/$/, ''),
  authApiTimeoutMs: Number(process.env.AUTH_API_TIMEOUT_MS ?? 5_000),
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/event_buddy_finder',
}
