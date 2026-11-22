import type { Pool, PoolClient } from 'pg'
import { EVENT_CATEGORY_NAMES } from '@event-buddy/contracts'

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
    u.preferred_categories
  FROM app_users u
`

async function queryProfile(
  database: Pool | PoolClient,
  userId: string,
): Promise<ProfileRow | undefined> {
  const result = await database.query<ProfileRow>(
    `${PROFILE_SELECT} WHERE u.firebase_uid = $1`,
    [userId],
  )
  return result.rows[0]
}

export async function getProfileById(userId: string): Promise<ProfileRow | undefined> {
  return queryProfile(pool, userId)
}

export async function findMissingCategories(categoryNames: string[]): Promise<string[]> {
  const allowed = new Set<string>(EVENT_CATEGORY_NAMES)
  return categoryNames.filter((name) => !allowed.has(name))
}

function assertKnownCategories(categoryNames: string[]): void {
  const allowed = new Set<string>(EVENT_CATEGORY_NAMES)
  const missingCategories = categoryNames.filter((name) => !allowed.has(name))
  if (missingCategories.length > 0) {
    throw Object.assign(new Error('Unknown categories'), { missingCategories })
  }
}

export async function createProfile(
  userId: string,
  email: string,
  profile: CreateProfileBody,
): Promise<ProfileRow> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    assertKnownCategories(profile.preferredCategories)
    await client.query(
      `INSERT INTO app_users (
        firebase_uid, email, display_name, age_range, affiliation, bio,
        preferred_categories, profile_completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        userId,
        email,
        profile.displayName,
        profile.ageRange ?? null,
        profile.affiliation ?? null,
        profile.bio ?? null,
        [...new Set(profile.preferredCategories)],
      ],
    )
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
    if (profile.preferredCategories !== undefined) assertKnownCategories(profile.preferredCategories)

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
    if (profile.preferredCategories !== undefined) {
      addAssignment('preferred_categories', [...new Set(profile.preferredCategories)])
    }
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
