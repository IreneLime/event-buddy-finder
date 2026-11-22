import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { controlOrigin, testDatabaseUrl, webOrigin } from './settings.mjs'

testDatabaseUrl()

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.mts',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  globalTeardown: './teardown.mts',
  outputDir: './test-results',
  use: { baseURL: webOrigin, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node --import tsx tests/e2e/stack.mts',
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    url: `${controlOrigin}/health`,
    reuseExistingServer: false,
    timeout: 90_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 15_000 },
  },
})
