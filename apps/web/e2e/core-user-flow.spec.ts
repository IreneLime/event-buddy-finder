import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test'

const firebaseProjectId = 'demo-event-buddy'
const emulatorOrigin = 'http://127.0.0.1:9199'
const backendPorts = new Set(['4101', '4102', '4103', '4104', '4105'])

async function checkServices(request: APIRequestContext) {
  for (const [name, port] of [
    ['auth', 4103], ['users', 4104], ['events', 4101], ['chat', 4102], ['images', 4105],
  ] as const) {
    const response = await request.get(`http://127.0.0.1:${port}/health`)
    expect(response.ok(), `${name} API health check returned ${response.status()}`).toBeTruthy()
  }
  const emulatorConfig = `${emulatorOrigin}/emulator/v1/projects/${firebaseProjectId}/config`
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await request.get(emulatorConfig, { timeout: 1_000 })).ok()) return
    } catch { /* Firebase may start after the Vite server reports ready. */ }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('Firebase Auth Emulator did not become ready on port 9199.')
}

function monitorUnexpectedApiErrors(page: Page, errors: string[]) {
  page.on('response', (response) => {
    const url = new URL(response.url())
    if (!backendPorts.has(url.port)) return
    // No image object is attached to these fresh test profiles/events, so the
    // image API's 404 is the normal fallback path. All other API failures fail.
    const expectedGuestAuthRejection = response.status() === 401 &&
      url.port === '4102' && ['/ListGroupChats', '/me/notifications'].includes(url.pathname)
    const expectedMissingCloudImage = url.port === '4105' && [404, 503].includes(response.status())
    if (response.status() >= 400 && !expectedGuestAuthRejection && !expectedMissingCloudImage) {
      errors.push(`${response.status()} ${url.pathname}`)
    }
  })
  page.on('requestfailed', (request) => {
    const url = new URL(request.url())
    if (backendPorts.has(url.port) && request.failure()?.errorText !== 'net::ERR_ABORTED' && url.port !== '4105') {
      errors.push(`Network failure ${url.origin}${url.pathname}`)
    }
  })
  page.on('pageerror', (error) => errors.push(`Browser error: ${error.message}`))
}

async function verifyEmulatorAccount(request: APIRequestContext, email: string) {
  const password = 'e2e-test-password-123'
  const signIn = await request.post(
    `${emulatorOrigin}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=event-buddy-e2e-api-key`,
    { data: { email, password, returnSecureToken: true }, timeout: 5_000 },
  )
  expect(signIn.ok(), `Firebase Auth Emulator should find ${email}`).toBeTruthy()
  const { localId } = await signIn.json()
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9199'
  const [{ initializeApp, getApps }, { getAuth }] = await Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin/auth'),
  ])
  const app = getApps().find((candidate) => candidate.name === 'event-buddy-e2e')
    ?? initializeApp({ projectId: firebaseProjectId }, 'event-buddy-e2e')
  await getAuth(app).updateUser(localId, { emailVerified: true })
}

async function registerAndCompleteProfile(
  page: Page,
  request: APIRequestContext,
  email: string,
  displayName: string,
) {
  await page.goto('/login')
  console.log(`Registering ${email}`)
  await page.getByRole('button', { name: 'Need an account? Register' }).click()
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('Password').fill('e2e-test-password-123')
  await page.getByRole('button', { name: 'Create account' }).click()
  console.log(`Created ${email}, waiting for email verification view`)
  await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible()

  await verifyEmulatorAccount(request, email)
  console.log(`Verified ${email} in emulator`)
  await page.getByRole('button', { name: /I.ve verified my email/ }).click()
  await expect(page.getByRole('heading', { name: 'Finish setting up your profile' })).toBeVisible()
  await page.getByLabel('Display name').fill(displayName)
  await page.getByLabel('Age range').selectOption('25_34')
  await page.getByLabel('Affiliation').fill('Event Buddy E2E')
  await page.getByLabel('Public bio').fill('A test account used to verify the connected event flow.')
  await page.getByPlaceholder('Arts, Food, Music').fill('Community, Music')
  await page.getByRole('button', { name: 'Create profile' }).click()
  await expect(page.getByRole('heading', { name: 'My profile' })).toBeVisible()
  console.log(`Completed profile for ${email}`)
}

async function newPage(browser: Browser, errors: string[]) {
  const context = await browser.newContext()
  const page = await context.newPage()
  monitorUnexpectedApiErrors(page, errors)
  return { context, page }
}

test('two verified users discover, join, chat about, and cancel an event', async ({ browser, request }) => {
  await checkServices(request)
  const suffix = randomUUID().slice(0, 8)
  const eventTitle = `E2E Neighbourhood Walk ${suffix}`
  const messageFromAttendee = `I am in for this walk ${suffix}`
  const messageFromHost = `See you at the meeting point ${suffix}`
  const apiErrors: string[] = []
  const eventStart = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const eventStartLocal = new Date(eventStart.getTime() - eventStart.getTimezoneOffset() * 60_000)
  const host = await newPage(browser, apiErrors)
  const attendee = await newPage(browser, apiErrors)

  try {
    await registerAndCompleteProfile(host.page, request, `host-${suffix}@example.test`, `E2E Host ${suffix}`)
    await host.page.getByRole('link', { name: 'Explore', exact: true }).click()
    await host.page.getByRole('link', { name: 'Create event' }).click()
    await host.page.getByPlaceholder('e.g. Sunday Clay Club').fill(eventTitle)
    await host.page.getByPlaceholder('Tell people what makes this event special…').fill('A relaxed walk with time to meet neighbours and enjoy the park.')
    await host.page.locator('input[type="datetime-local"]').fill(eventStartLocal.toISOString().slice(0, 16))
    await host.page.locator('form select').nth(0).selectOption({ label: 'Community' })
    await host.page.locator('form select').nth(1).selectOption({ label: 'Toronto' })
    await host.page.getByPlaceholder('Place or venue name').fill('Trinity Bellwoods Park')
    await host.page.getByPlaceholder('Street address or useful directions').fill('Meet at the south entrance')
    await host.page.getByPlaceholder('Help people know what to expect…').fill('Bring comfortable shoes and a water bottle.')
    await host.page.getByRole('button', { name: 'Post event' }).click()
    await expect(host.page.getByRole('heading', { name: eventTitle })).toBeVisible()

    await registerAndCompleteProfile(attendee.page, request, `attendee-${suffix}@example.test`, `E2E Attendee ${suffix}`)
    await attendee.page.getByRole('link', { name: 'Explore', exact: true }).click()
    await expect(attendee.page.getByRole('link', { name: `View ${eventTitle}` })).toBeVisible()
    await attendee.page.getByRole('link', { name: `View ${eventTitle}` }).click()
    await expect(attendee.page.getByRole('heading', { name: eventTitle })).toBeVisible()
    await attendee.page.getByRole('button', { name: 'Interested' }).click()
    await expect(attendee.page.getByRole('button', { name: 'Interested' })).toHaveAttribute('aria-pressed', 'true')
    await attendee.page.getByRole('link', { name: 'Open event chat' }).click()
    await expect(attendee.page.getByRole('heading', { name: eventTitle })).toBeVisible()
    const attendeeComposer = attendee.page.getByRole('textbox', { name: 'Write a message' })
    await attendeeComposer.fill(messageFromAttendee)
    await attendee.page.getByRole('button', { name: 'Send message' }).click()
    await expect(attendee.page.getByRole('log').getByText(messageFromAttendee)).toBeVisible()

    await host.page.getByRole('link', { name: 'Open event chat' }).click()
    await expect(host.page.getByRole('log').getByText(messageFromAttendee)).toBeVisible()
    await host.page.getByRole('link', { name: 'View event' }).click()
    await host.page.getByRole('button', { name: 'Cancel event' }).click()
    await host.page.getByRole('button', { name: 'Confirm cancellation' }).click()
    await expect(host.page.getByText('Event cancelled.')).toBeVisible()

    await expect(attendee.page.getByRole('status').filter({ hasText: 'Event cancelled' })).toBeVisible({ timeout: 15_000 })
    await attendee.page.goto('/notifications')
    await expect(attendee.page.getByText(`${eventTitle} has been cancelled.`)).toBeVisible()

    expect(apiErrors, 'The browser flow should not receive unexpected backend API failures').toEqual([])
  } finally {
    await Promise.all([host.context.close().catch(() => {}), attendee.context.close().catch(() => {})])
  }
})
