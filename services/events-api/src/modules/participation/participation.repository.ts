import type { ParticipationStatus } from '@event-buddy/contracts'

import { pool } from '../../db/pool.js'

export interface ParticipantRow {
  user_id: string
  display_name: string
  status: ParticipationStatus
  profile_image_key: string | null
}

export async function getParticipation(
  eventId: string,
  userId: string,
): Promise<{ status: ParticipationStatus } | undefined> {
  const result = await pool.query<{ status: ParticipationStatus }>(
    `
      SELECT status
      FROM event_participations
      WHERE event_id = $1 AND user_id = $2
    `,
    [eventId, userId],
  )
  return result.rows[0]
}

export async function countGoing(eventId: string): Promise<number> {
  const result = await pool.query<{ count: number }>(
    `
      SELECT COUNT(*)::int AS count
      FROM event_participations
      WHERE event_id = $1 AND status = 'going'
    `,
    [eventId],
  )
  return result.rows[0]?.count ?? 0
}

export async function upsertParticipation(
  eventId: string,
  userId: string,
  status: ParticipationStatus,
): Promise<ParticipationStatus> {
  const result = await pool.query<{ status: ParticipationStatus }>(
    `
      INSERT INTO event_participations (event_id, user_id, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (event_id, user_id)
      DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
      RETURNING status
    `,
    [eventId, userId, status],
  )
  // TODO(Grace): sync event conversation membership when status becomes interested/going/withdrawn
  return result.rows[0]!.status
}

export async function listParticipants(
  eventId: string,
  options: {
    status?: ParticipationStatus
    page: number
    limit: number
  },
): Promise<{ rows: ParticipantRow[]; total: number }> {
  const values: unknown[] = [eventId]
  const filters = ['ep.event_id = $1']

  if (options.status) {
    values.push(options.status)
    filters.push(`ep.status = $${values.length}`)
  } else {
    filters.push(`ep.status IN ('interested', 'going')`)
  }

  const whereClause = `WHERE ${filters.join(' AND ')}`
  const offset = (options.page - 1) * options.limit
  values.push(options.limit)
  const limitParam = `$${values.length}`
  values.push(offset)
  const offsetParam = `$${values.length}`

  const listSql = `
    SELECT
      ep.user_id,
      u.display_name,
      ep.status,
      u.profile_image_key
    FROM event_participations ep
    JOIN app_users u ON u.firebase_uid = ep.user_id
    ${whereClause}
    ORDER BY
      CASE ep.status WHEN 'going' THEN 0 WHEN 'interested' THEN 1 ELSE 2 END,
      u.display_name ASC
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `

  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM event_participations ep
    ${whereClause}
  `
  const countValues = values.slice(0, values.length - 2)

  const [listResult, countResult] = await Promise.all([
    pool.query<ParticipantRow>(listSql, values),
    pool.query<{ total: number }>(countSql, countValues),
  ])

  return {
    rows: listResult.rows,
    total: countResult.rows[0]?.total ?? 0,
  }
}
