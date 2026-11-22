import { expect, join, test } from './fixtures.mjs'
import { chatOrigin, controlOrigin, eventsOrigin } from './settings.mjs'

test('event updates and cancellation reach the browser and saved inbox/read state survive chat restart', async ({ accounts, database, event, request }) => {
  const { cathy, mina } = accounts
  await join(cathy, event, 'Interested')
  await join(mina, event, 'Going')
  await cathy.goto('/notifications')
  await expect(cathy.getByText('0 unread · Live updates connected')).toBeVisible()
  const updated = await request.patch(`${eventsOrigin}/events/${event.id}`, {
    headers: { Authorization: 'Bearer dev:demo-mina' }, data: { locationName: 'New browser test meeting point' },
  })
  expect(updated.ok(), await updated.text()).toBe(true)
  const saved = await database.query("SELECT id::text, message FROM notifications WHERE event_id = $1 AND recipient_user_id = 'demo-cathy' AND kind = 'event_updated'", [event.id])
  expect(saved.rowCount).toBe(1)
  await expect(cathy.getByRole('region', { name: 'Live event alerts' }).getByText(saved.rows[0].message, { exact: true })).toBeVisible()
  await expect(cathy.getByText('1 unread · Live updates connected')).toBeVisible()
  expect((await request.post(`${controlOrigin}/chat/restart`)).status()).toBe(204)
  await expect(cathy.getByText('1 unread · Live updates connected')).toBeVisible()
  await cathy.reload()
  await expect(cathy.getByText(saved.rows[0].message, { exact: true })).toBeVisible()
  await cathy.getByRole('button', { name: 'Mark all as read' }).click()
  await expect(cathy.getByText('0 unread · Live updates connected')).toBeVisible()
  expect((await database.query('SELECT read_at FROM notifications WHERE id = $1', [saved.rows[0].id])).rows[0].read_at).not.toBeNull()

  await mina.goto(`/events/${event.id}`)
  await mina.getByRole('button', { name: 'Cancel event', exact: true }).click()
  await mina.getByRole('button', { name: 'Confirm cancellation' }).click()
  const cancelled = cathy.getByRole('region', { name: 'Live event alerts' })
  await expect(cancelled.getByText('Event cancelled', { exact: true })).toBeVisible()
  const rows = await database.query("SELECT id::text, message FROM notifications WHERE event_id = $1 AND recipient_user_id = 'demo-cathy' AND kind = 'event_cancelled'", [event.id])
  expect(rows.rowCount).toBe(1)
  await expect(cancelled.getByText(rows.rows[0].message, { exact: true })).toBeVisible()
  expect((await request.post(`${controlOrigin}/chat/restart`)).status()).toBe(204)
  const response = await request.get(`${chatOrigin}/me/notifications`, { headers: { 'x-demo-user-id': 'cathy' } })
  const inbox = await response.json()
  expect(inbox.items.find((item: { id: string }) => item.id === saved.rows[0].id).readAt).toBeTruthy()
  expect(inbox.items.find((item: { id: string }) => item.id === rows.rows[0].id).kind).toBe('event_cancelled')
  await cathy.reload()
  await expect(cathy.getByText(rows.rows[0].message, { exact: true })).toBeVisible()
})
