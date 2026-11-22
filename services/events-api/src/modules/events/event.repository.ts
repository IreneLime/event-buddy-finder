import { EVENT_CATEGORIES, EVENT_CATEGORY_NAMES } from '@event-buddy/contracts'

import { pool } from '../../db/pool.js'
import { ApiError } from '../../utils/ApiError.js'
import { buildEventListFilters } from './event.filters.js'
import type { CreateEventBody, EventListQueryInput, UpdateEventBody } from './event.validation.js'
import type { EventRow } from './event.mapper.js'

const EVENT_SELECT = `
  SELECT
    COALESCE(e.public_id, e.id::text) AS id,
    e.created_by_user_id,
    e.title,
    e.description,
    e.starts_at,
    e.ends_at,
    e.location_name,
    e.address,
    e.city,
    e.latitude,
    e.longitude,
    e.price_amount,
    e.capacity,
    e.notes,
    e.image_object_key,
    e.status,
    u.display_name AS organizer_name,
    COALESCE((
      SELECT COUNT(*)::int
      FROM event_participations ep
      WHERE ep.event_id = e.id AND ep.status IN ('interested', 'going')
    ), 0) AS participant_count,
    e.category_names,
    viewer.status AS viewer_participation
  FROM events e
  JOIN app_users u ON u.firebase_uid = e.created_by_user_id
  LEFT JOIN event_participations viewer
    ON viewer.event_id = e.id AND viewer.user_id = $1
`

const SORT_COLUMNS = {
  startsAt: 'e.starts_at',
  createdAt: 'e.created_at',
  title: 'e.title',
} as const

export interface EventOwnershipRow {
  id: string
  created_by_user_id: string
  status: 'scheduled' | 'cancelled'
  starts_at: Date
  ends_at: Date | null
  capacity: number | null
}

export async function listEvents(
  viewerUserId: string | undefined,
  query: EventListQueryInput,
): Promise<{ rows: EventRow[]; total: number }> {
  // List query: $1 = viewer for EVENT_SELECT; filters start at $2.
  const listFilters = buildEventListFilters(query, 2)
  const listValues: unknown[] = [viewerUserId ?? null, ...listFilters.values]
  const listWhereClause = `WHERE ${listFilters.filters.join(' AND ')}`

  const sortColumn = SORT_COLUMNS[query.sortBy]
  const sortOrder = query.order === 'desc' ? 'DESC' : 'ASC'
  const offset = (query.page - 1) * query.limit

  listValues.push(query.limit)
  const limitParam = `$${listValues.length}`
  listValues.push(offset)
  const offsetParam = `$${listValues.length}`

  const listSql = `
    ${EVENT_SELECT}
    ${listWhereClause}
    ORDER BY ${sortColumn} ${sortOrder}, e.id ASC
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `

  // Count query has no viewer join, so filters must start at $1 (unused $1 breaks Postgres typing).
  const countFilters = buildEventListFilters(query, 1)
  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM events e
    WHERE ${countFilters.filters.join(' AND ')}
  `

  const [listResult, countResult] = await Promise.all([
    pool.query<EventRow>(listSql, listValues),
    pool.query<{ total: number }>(countSql, countFilters.values),
  ])

  return {
    rows: listResult.rows,
    total: countResult.rows[0]?.total ?? 0,
  }
}

export async function getEventById(
  eventId: string,
  viewerUserId: string | undefined,
): Promise<EventRow | undefined> {
  const result = await pool.query<EventRow>(
    `
      ${EVENT_SELECT}
      WHERE e.id::text = $2 OR e.public_id = $2
    `,
    [viewerUserId ?? null, eventId],
  )
  return result.rows[0]
}

export async function getEventOwnership(eventId: string): Promise<EventOwnershipRow | undefined> {
  const result = await pool.query<EventOwnershipRow>(
    `
      SELECT id::text, created_by_user_id, status, starts_at, ends_at, capacity
      FROM events
      WHERE id::text = $1 OR public_id = $1
    `,
    [eventId],
  )
  return result.rows[0]
}

export async function userExists(userId: string): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM app_users WHERE firebase_uid = $1) AS exists`,
    [userId],
  )
  return Boolean(result.rows[0]?.exists)
}

function validateCategoryNames(categoryNames: string[]): void {
  const allowed = new Set<string>(EVENT_CATEGORY_NAMES)
  const missing = categoryNames.filter((name) => !allowed.has(name))
  if (missing.length > 0) {
    throw Object.assign(new Error('Unknown categories'), { missingCategories: missing })
  }
}

export async function createEvent(creatorId: string, body: CreateEventBody): Promise<string> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    validateCategoryNames(body.categoryNames)

    const insert = await client.query<{ id: string }>(
      `
        INSERT INTO events (
          created_by_user_id,
          title,
          description,
          starts_at,
          ends_at,
          location_name,
          address,
          city,
          latitude,
          longitude,
          price_amount,
          capacity,
          notes,
          image_object_key,
          category_names
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id::text
      `,
      [
        creatorId,
        body.title,
        body.description,
        body.startsAt,
        body.endsAt ?? null,
        body.locationName,
        body.address ?? null,
        body.city ?? 'Toronto',
        body.latitude ?? null,
        body.longitude ?? null,
        body.priceAmount ?? null,
        body.capacity ?? null,
        body.notes ?? null,
        body.imageObjectKey ?? null,
        [...new Set(body.categoryNames)],
      ],
    )

    const eventId = insert.rows[0]!.id
    // TODO(Grace): create event conversation with host as first member
    await client.query('COMMIT')
    return eventId
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function updateEvent(eventId: string, body: UpdateEventBody, actorUserId: string): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT set_config('app.actor_user_id', $1, true)", [actorUserId])
    const locked = await client.query<{ status: string }>('SELECT status FROM events WHERE id = $1 FOR UPDATE', [eventId])
    if (locked.rows[0]?.status === 'cancelled') throw new ApiError(400, 'Cancelled events cannot be updated')
    if (body.categoryNames) validateCategoryNames(body.categoryNames)

    const columns: Record<string, string> = {
      title: 'title', description: 'description', notes: 'notes', city: 'city',
      startsAt: 'starts_at', endsAt: 'ends_at', locationName: 'location_name', address: 'address',
      latitude: 'latitude', longitude: 'longitude', priceAmount: 'price_amount', capacity: 'capacity',
      categoryNames: 'category_names', imageObjectKey: 'image_object_key',
    }
    const sets: string[] = []
    const values: unknown[] = []
    for (const [field, column] of Object.entries(columns)) {
      const value = body[field as keyof UpdateEventBody]
      if (value !== undefined) { values.push(value); sets.push(`${column} = $${values.length}`) }
    }
    sets.push('updated_at = NOW()')
    values.push(eventId)
    await client.query(`UPDATE events SET ${sets.join(', ')} WHERE id = $${values.length}`, values)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}

export async function cancelEvent(eventId: string, actorUserId: string): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT set_config('app.actor_user_id', $1, true)", [actorUserId])
    await client.query(`UPDATE events SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND status = 'scheduled'`, [eventId])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}

export async function listCategories(): Promise<{ id: string; name: string }[]> {
  return [...EVENT_CATEGORIES].sort((a, b) => a.name.localeCompare(b.name))
}

export async function listMyEvents(
  userId: string,
  options: {
    role?: 'hosted' | 'attending'
    status?: 'interested' | 'going' | 'withdrawn'
    page: number
    limit: number
  },
): Promise<{ rows: EventRow[]; total: number }> {
  const values: unknown[] = [userId]
  const filters: string[] = []

  if (options.role === 'hosted') {
    filters.push('e.created_by_user_id = $1')
  } else if (options.role === 'attending') {
    filters.push(`EXISTS (
      SELECT 1 FROM event_participations ep
      WHERE ep.event_id = e.id AND ep.user_id = $1
        ${options.status ? `AND ep.status = $2` : `AND ep.status IN ('interested', 'going')`}
    )`)
    if (options.status) {
      values.push(options.status)
    }
  } else {
    filters.push(`(
      e.created_by_user_id = $1
      OR EXISTS (
        SELECT 1 FROM event_participations ep
        WHERE ep.event_id = e.id AND ep.user_id = $1
          ${options.status ? `AND ep.status = $2` : `AND ep.status IN ('interested', 'going', 'withdrawn')`}
      )
    )`)
    if (options.status) {
      values.push(options.status)
    }
  }

  const whereClause = `WHERE ${filters.join(' AND ')}`
  const offset = (options.page - 1) * options.limit
  values.push(options.limit)
  const limitParam = `$${values.length}`
  values.push(offset)
  const offsetParam = `$${values.length}`

  const listSql = `
    ${EVENT_SELECT}
    ${whereClause}
    ORDER BY e.starts_at DESC, e.id DESC
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `

  const countValues = values.slice(0, values.length - 2)
  // EVENT_SELECT uses $1 as viewer; for count we only need the filter params starting after viewer reuse.
  // Here $1 is both viewer and the user filter, so count uses the same leading params.
  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM events e
    ${whereClause}
  `

  const [listResult, countResult] = await Promise.all([
    pool.query<EventRow>(listSql, values),
    pool.query<{ total: number }>(countSql, countValues),
  ])

  return {
    rows: listResult.rows,
    total: countResult.rows[0]?.total ?? 0,
  }
}
