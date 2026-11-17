import type { CurrentUserProfile, UserProfile } from '@event-buddy/contracts'

export interface ProfileRow {
  firebase_uid: string
  email: string
  display_name: string
  age_range: UserProfile['ageRange'] | null
  affiliation: string | null
  bio: string | null
  profile_image_key: string | null
  profile_completed_at: Date | string | null
  preferred_categories: string[] | null
}

export function mapPublicProfile(row: ProfileRow): UserProfile {
  return {
    id: row.firebase_uid,
    displayName: row.display_name,
    ...(row.affiliation ? { affiliation: row.affiliation } : {}),
    ...(row.age_range ? { ageRange: row.age_range } : {}),
    ...(row.bio ? { bio: row.bio } : {}),
    preferredCategories: row.preferred_categories ?? [],
  }
}

export function mapCurrentUserProfile(row: ProfileRow): CurrentUserProfile {
  return {
    ...mapPublicProfile(row),
    email: row.email,
    profileCompleted: row.profile_completed_at !== null,
  }
}
