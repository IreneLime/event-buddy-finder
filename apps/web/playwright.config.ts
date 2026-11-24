import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { defineConfig, devices } from '@playwright/test'

const webRoot = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(webRoot, '../..')
const databaseUrl = process.env.E2E_DATABASE_URL

if (!databaseUrl) {
  throw new Error('Set E2E_DATABASE_URL to a dedicated, seeded PostgreSQL test database before running the browser test.')
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 12_000 },
  reporter: 'list',
  outputDir: './test-results',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev:e2e',
    cwd: repoRoot,
    url: 'http://localhost:5174',
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: databaseUrl,
      WEB_ORIGIN: 'http://localhost:5174',
      AUTH_API_URL: 'http://127.0.0.1:4103',
      ALLOW_DEV_AUTH: 'false',
      FIREBASE_PROJECT_ID: 'demo-event-buddy',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9199',
      CHAT_DEV_MODE: 'false',
      VITE_FIREBASE_API_KEY: 'event-buddy-e2e-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'localhost',
      VITE_FIREBASE_PROJECT_ID: 'demo-event-buddy',
      VITE_USE_FIREBASE_AUTH_EMULATOR: 'true',
      VITE_FIREBASE_AUTH_EMULATOR_URL: 'http://127.0.0.1:9199',
      VITE_USE_FIREBASE_AUTH_EMULATOR: 'true',
      VITE_USERS_API_URL: 'http://127.0.0.1:4104',
      VITE_IMAGE_API_URL: 'http://127.0.0.1:4105',
      VITE_EVENTS_API_URL: 'http://127.0.0.1:4101',
      VITE_CHAT_API_URL: 'http://127.0.0.1:4102',
    },
  },
})
