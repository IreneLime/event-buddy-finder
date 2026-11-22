import { pool } from '../../db/pool.js'
import type { UserEventRow } from './user-events.mapper.js'
import type { UserEventsQuery } from './user-events.validation.js'

const USER_EVENT_SELECT = `
  SELECT
    e.id,
    e.title,
    e.description,
    e.starts_at,
    e.ends_at,
    e.location_name,
    e.address,
    e.price_amount,
    e.capacity,
    e.status,
    organizer.display_name AS organizer_name,
    (SELECT COUNT(*)::int FROM event_participations counts
      WHERE counts.event_id = e.id AND counts.status = 'going') AS participant_count,
    e.category_names
  FROM event_participations participation
  JOIN events e ON e.id = participation.event_id
  JOIN app_users organizer ON organizer.firebase_uid = e.created_by_user_id
`

export async function listPastEventsForUser(
  userId: string,
  query: UserEventsQuery,
): Promise<{ rows: UserEventRow[]; total: number }> {
  const offset = (query.page - 1) * query.limit
  const where = `
    WHERE participation.user_id = $1
      AND participation.status = 'going'
      AND COALESCE(e.ends_at, e.starts_at) < NOW()
  `
  const [events, count] = await Promise.all([
    pool.query<UserEventRow>(
      `
        ${USER_EVENT_SELECT}
        ${where}
        ORDER BY e.starts_at DESC, e.id DESC
        LIMIT $2 OFFSET $3
      `,
      [userId, query.limit, offset],
    ),
    pool.query<{ total: number }>(
      `
        SELECT COUNT(*)::int AS total
        FROM event_participations participation
        JOIN events e ON e.id = participation.event_id
        ${where}
      `,
      [userId],
    ),
  ])
  return { rows: events.rows, total: count.rows[0]?.total ?? 0 }
}
