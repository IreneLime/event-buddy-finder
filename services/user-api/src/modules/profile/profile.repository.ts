import type { Pool, PoolClient } from 'pg'

import { pool } from '../../db/pool.js'
import type { ProfileRow } from './profile.mapper.js'
import type { CreateProfileBody, UpdateProfileBody } from './profile.validation.js'

const PROFILE_SELECT = `
  SELECT
    u.firebase_uid,
    u.email,
    u.display_name,
    u.age_range,
    u.affiliation,
    u.bio,
    u.profile_image_key,
    u.profile_completed_at,
    COALESCE(
      array_agg(c.name ORDER BY c.name)
        FILTER (WHERE c.name IS NOT NULL),
      '{}'
    ) AS preferred_categories
  FROM app_users u
  LEFT JOIN user_category_preferences ucp ON ucp.user_id = u.firebase_uid
  LEFT JOIN categories c ON c.id = ucp.category_id
`

async function queryProfile(
  database: Pool | PoolClient,
  userId: string,
): Promise<ProfileRow | undefined> {
  const result = await database.query<ProfileRow>(
    `
      ${PROFILE_SELECT}
      WHERE u.firebase_uid = $1
      GROUP BY u.firebase_uid
    `,
    [userId],
  )
  return result.rows[0]
}

export async function getProfileById(userId: string): Promise<ProfileRow | undefined> {
  return queryProfile(pool, userId)
}

async function resolveCategoryIds(
  client: PoolClient,
  categoryNames: string[],
): Promise<number[]> {
  if (categoryNames.length === 0) return []
  const result = await client.query<{ id: string; name: string }>(
    `SELECT id::text, name FROM categories WHERE name = ANY($1::text[])`,
    [categoryNames],
  )
  const categoryIds = new Map(result.rows.map((row) => [row.name, Number(row.id)]))
  const missingCategories = categoryNames.filter((name) => !categoryIds.has(name))
  if (missingCategories.length > 0) {
    throw Object.assign(new Error('Unknown categories'), { missingCategories })
  }
  return categoryNames.map((name) => categoryIds.get(name)!)
}

async function replaceCategoryPreferences(
  client: PoolClient,
  userId: string,
  categoryIds: number[],
): Promise<void> {
  await client.query(`DELETE FROM user_category_preferences WHERE user_id = $1`, [userId])
  for (const categoryId of categoryIds) {
    await client.query(
      `INSERT INTO user_category_preferences (user_id, category_id) VALUES ($1, $2)`,
      [userId, categoryId],
    )
  }
}

export async function findMissingCategories(categoryNames: string[]): Promise<string[]> {
  if (categoryNames.length === 0) return []
  const result = await pool.query<{ name: string }>(
    `SELECT name FROM categories WHERE name = ANY($1::text[])`,
    [categoryNames],
  )
  const found = new Set(result.rows.map((row) => row.name))
  return categoryNames.filter((name) => !found.has(name))
}

export async function createProfile(
  userId: string,
  email: string,
  profile: CreateProfileBody,
): Promise<ProfileRow> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const categoryIds = await resolveCategoryIds(client, profile.preferredCategories)
    await client.query(
      `
        INSERT INTO app_users (
          firebase_uid, email, display_name, age_range, affiliation, bio, profile_completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `,
      [
        userId,
        email,
        profile.displayName,
        profile.ageRange ?? null,
        profile.affiliation ?? null,
        profile.bio ?? null,
      ],
    )
    await replaceCategoryPreferences(client, userId, categoryIds)
    const savedProfile = await queryProfile(client, userId)
    if (!savedProfile) throw new Error('Profile was not returned after creation')
    await client.query('COMMIT')
    return savedProfile
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function updateProfile(
  userId: string,
  email: string,
  profile: UpdateProfileBody,
): Promise<ProfileRow | undefined> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const categoryIds =
      profile.preferredCategories === undefined
        ? undefined
        : await resolveCategoryIds(client, profile.preferredCategories)

    const values: unknown[] = [email]
    const assignments = ['email = $1']
    const addAssignment = (column: string, value: unknown) => {
      values.push(value)
      assignments.push(`${column} = $${values.length}`)
    }
    if (profile.displayName !== undefined) addAssignment('display_name', profile.displayName)
    if (profile.ageRange !== undefined) addAssignment('age_range', profile.ageRange)
    if (profile.affiliation !== undefined) addAssignment('affiliation', profile.affiliation)
    if (profile.bio !== undefined) addAssignment('bio', profile.bio)
    assignments.push('updated_at = NOW()')
    values.push(userId)

    const updated = await client.query(
      `UPDATE app_users SET ${assignments.join(', ')} WHERE firebase_uid = $${values.length}`,
      values,
    )
    if (updated.rowCount === 0) {
      await client.query('ROLLBACK')
      return undefined
    }
    if (categoryIds !== undefined) {
      await replaceCategoryPreferences(client, userId, categoryIds)
    }
    const savedProfile = await queryProfile(client, userId)
    if (!savedProfile) throw new Error('Profile was not returned after update')
    await client.query('COMMIT')
    return savedProfile
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
