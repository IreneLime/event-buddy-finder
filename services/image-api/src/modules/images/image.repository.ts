import { pool } from '../../db/pool.js'

export async function getProfileImageKey(userId: string): Promise<string | null | undefined> {
  const result = await pool.query<{ profile_image_key: string | null }>(
    `SELECT profile_image_key FROM app_users WHERE firebase_uid = $1`,
    [userId],
  )
  return result.rows[0]?.profile_image_key
}

export async function replaceProfileImageKey(
  userId: string,
  imageKey: string | null,
): Promise<{ previousKey: string | null } | undefined> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const existing = await client.query<{ profile_image_key: string | null }>(
      `SELECT profile_image_key FROM app_users WHERE firebase_uid = $1 FOR UPDATE`,
      [userId],
    )
    if (!existing.rows[0]) {
      await client.query('ROLLBACK')
      return undefined
    }
    await client.query(
      `UPDATE app_users SET profile_image_key = $2, updated_at = NOW() WHERE firebase_uid = $1`,
      [userId, imageKey],
    )
    await client.query('COMMIT')
    return { previousKey: existing.rows[0].profile_image_key }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function resolveEventImageId(eventId: string): Promise<string | undefined> {
  const result = await pool.query<{ id: string }>(
    "SELECT id::text FROM events e WHERE id::text = $1 OR to_jsonb(e)->>'public_id' = $1",
    [eventId],
  )
  return result.rows[0]?.id
}

export async function getEventImageKey(eventId: string): Promise<string | null | undefined> {
  const result = await pool.query<{ image_object_key: string | null }>(
    `SELECT image_object_key FROM events WHERE id = $1`,
    [eventId],
  )
  return result.rows[0]?.image_object_key
}

export async function replaceEventImageKey(
  eventId: string,
  userId: string,
  imageKey: string | null,
): Promise<'not_found' | 'forbidden' | { previousKey: string | null }> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const existing = await client.query<{
      image_object_key: string | null
      can_manage: boolean
    }>(
      `
        SELECT
          e.image_object_key,
          (
            e.created_by_user_id = $2
            OR EXISTS (
              SELECT 1 FROM group_members gm
              WHERE gm.group_id = e.organizing_group_id
                AND gm.user_id = $2
                AND gm.role = 'organizer'
            )
          ) AS can_manage
        FROM events e
        WHERE e.id = $1
        FOR UPDATE
      `,
      [eventId, userId],
    )
    const row = existing.rows[0]
    if (!row) {
      await client.query('ROLLBACK')
      return 'not_found'
    }
    if (!row.can_manage) {
      await client.query('ROLLBACK')
      return 'forbidden'
    }
    await client.query(
      `UPDATE events SET image_object_key = $2, updated_at = NOW() WHERE id = $1`,
      [eventId, imageKey],
    )
    await client.query('COMMIT')
    return { previousKey: row.image_object_key }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
