import { connected, expect, history, join, send, test } from './fixtures.mjs'
import { controlOrigin } from './settings.mjs'

test('public profile opens one DM, delivers the first message, and restores it after a real chat process restart', async ({ accounts, database, event, request }) => {
  const { cathy, mina } = accounts
  await join(cathy, event, 'Interested')
  await join(mina, event, 'Going')
  const directRequests: string[] = []
  cathy.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/conversations/direct') directRequests.push(request.url())
  })
  await cathy.goto('/profile/mina')
  await cathy.getByRole('button', { name: 'Message Mina' }).click()
  await expect(cathy).toHaveURL(/\/chats\/direct-\d+$/)
  await expect(cathy.getByRole('textbox', { name: 'Write a message' })).toBeVisible()
  const path = new URL(cathy.url()).pathname
  const id = path.split('/').at(-1)!
  await mina.goto(path)
  await expect(mina.getByRole('heading', { name: 'Cathy Chen', exact: true })).toBeVisible()
  await connected(mina)
  await send(cathy, 'First direct message from a public profile')
  await expect(mina.getByRole('log').getByText('First direct message from a public profile', { exact: true })).toBeVisible()
  expect(directRequests).toHaveLength(1)
  const saved = await history(request, id)
  const stored = await database.query('SELECT id::text, body FROM messages WHERE conversation_id = $1', [id.slice('direct-'.length)])
  expect(stored.rows).toEqual([{ id: saved.items[0].id, body: saved.items[0].body }])

  // A second intentional profile click reuses the same durable conversation.
  await cathy.goto('/profile/mina')
  await cathy.getByRole('button', { name: 'Message Mina' }).click()
  await expect(cathy).toHaveURL(new RegExp(`${path}$`))
  await expect(cathy.getByRole('textbox', { name: 'Write a message' })).toBeVisible()
  expect(directRequests).toHaveLength(2)
  expect((await database.query("SELECT COUNT(*)::int AS count FROM conversations WHERE kind = 'direct'")).rows[0].count).toBe(1)

  expect((await request.post(`${controlOrigin}/chat/restart`)).status()).toBe(204)
  await connected(cathy)
  await connected(mina)
  expect(await history(request, id)).toEqual(saved)
  await send(mina, 'A direct reply after the process restarted')
  await expect(cathy.getByRole('log').getByText('A direct reply after the process restarted', { exact: true })).toBeVisible()
  expect(directRequests).toHaveLength(2)
})
