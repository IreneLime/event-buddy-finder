import { randomUUID } from 'node:crypto'
import { expect, test as base, type BrowserContext, type Page } from '@playwright/test'
import pg from 'pg'
import { chatOrigin, controlOrigin, eventsOrigin, testDatabaseUrl, webOrigin } from './settings.mjs'

interface Accounts {
  cathy: Page
  mina: Page
}
interface Event { id: string; title: string }

export const test = base.extend<{ accounts: Accounts; database: pg.Pool; event: Event }>({
  accounts: async ({ browser }, use) => {
    const contexts: BrowserContext[] = []
    const pages: Page[] = []
    const errors: string[] = []
    try {
      for (const id of ['cathy', 'mina']) {
        const context = await browser.newContext({ baseURL: webOrigin })
        contexts.push(context)
        const page = await context.newPage()
        page.on('pageerror', (error) => errors.push(error.message))
        await page.goto('/login')
        await page.getByPlaceholder('you@example.test').fill(`${id}@example.test`)
        await page.getByPlaceholder('Demo account password').fill('demo1234')
        await page.getByRole('button', { name: 'Sign in', exact: true }).click()
        await expect(page).toHaveURL(/\/events$/)
        pages.push(page)
      }
      await use({ cathy: pages[0], mina: pages[1] })
      expect(errors, 'No browser JavaScript errors').toEqual([])
    } finally { await Promise.all(contexts.map((context) => context.close())) }
  },
  database: async ({ request }, use) => {
    const response = await request.get(`${controlOrigin}/health`)
    expect(response.ok()).toBe(true)
    const health = await response.json()
    expect(health).toMatchObject({ storage: 'postgresql', notifications: 'postgresql', membership: 'events-postgresql' })
    expect(health.database).toMatch(/^chat_browser_[a-f0-9]+$/)
    const url = new URL(testDatabaseUrl())
    url.pathname = `/${health.database}`
    const pool = new pg.Pool({ connectionString: url.toString() })
    try { await use(pool) }
    finally { await pool.end() }
  },
  event: async ({ request }, use) => {
    const response = await request.post(`${eventsOrigin}/events`, {
      headers: { Authorization: 'Bearer dev:demo-mina' },
      data: { title: `Chat browser event ${randomUUID().slice(0, 8)}`, description: 'Disposable browser regression event.',
        startsAt: new Date(Date.now() + 30 * 86_400_000).toISOString(), locationName: 'Toronto test venue', categoryNames: ['Music'] },
    })
    expect(response.status(), await response.text()).toBe(201)
    await use(await response.json())
  },
})

export { expect }

export async function join(page: Page, event: Event, status: 'Interested' | 'Going') {
  await page.goto(`/events/${event.id}`)
  const button = page.getByRole('button', { name: status, exact: true })
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('link', { name: 'Open event chat' })).toBeVisible()
}

export async function connected(page: Page) {
  await expect(page.getByLabel('Chat connection: connected').first()).toBeVisible()
}

export async function send(page: Page, body: string) {
  await connected(page)
  await page.getByRole('textbox', { name: 'Write a message' }).fill(body)
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByRole('log').getByText(body, { exact: true })).toBeVisible()
}

export async function history(request: import('@playwright/test').APIRequestContext, id: string, user = 'cathy') {
  const response = await request.get(`${chatOrigin}/conversations/${id}/messages`, { headers: { 'x-demo-user-id': user } })
  expect(response.ok(), await response.text()).toBe(true)
  return response.json()
}
