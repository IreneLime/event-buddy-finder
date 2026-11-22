import { connected, expect, history, join, send, test } from './fixtures.mjs'
import { controlOrigin } from './settings.mjs'

test('event RSVP unlocks PostgreSQL group chat and mounted browsers recover through a real process restart', async ({ accounts, database, event, request }) => {
  const { cathy, mina } = accounts
  await join(cathy, event, 'Interested')
  await join(mina, event, 'Going')
  await cathy.getByRole('link', { name: 'Open event chat' }).click()
  await mina.getByRole('link', { name: 'Open event chat' }).click()
  await expect(cathy).toHaveURL(/\/chats\/event-\d+$/)
  await expect(cathy.getByRole('textbox', { name: 'Write a message' })).toBeVisible()
  await connected(mina)
  const id = new URL(cathy.url()).pathname.split('/').at(-1)!
  await send(cathy, 'Meet at the entrance before restart')
  await expect(mina.getByRole('log').getByText('Meet at the entrance before restart', { exact: true })).toBeVisible()
  const saved = await history(request, id)
  expect((await database.query('SELECT body FROM messages WHERE id = $1', [saved.items[0].id])).rows[0].body).toBe(saved.items[0].body)
  expect((await request.post(`${controlOrigin}/chat/restart`)).status()).toBe(204)
  await connected(cathy)
  await connected(mina)
  expect(await history(request, id)).toEqual(saved)
  await send(mina, 'Group chat still works after restart')
  await expect(cathy.getByRole('log').getByText('Group chat still works after restart', { exact: true })).toBeVisible()
  // Reloading also retrieves the same database-backed transcript.
  await cathy.reload()
  await expect(cathy.getByRole('log').getByText('Meet at the entrance before restart', { exact: true })).toBeVisible()
  await expect(cathy.getByRole('log').getByText('Group chat still works after restart', { exact: true })).toBeVisible()
})
