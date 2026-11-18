import type { EventStatus, EventSummary, ParticipationStatus } from '@event-buddy/contracts'

export interface EventRow {
  id: string | number
  title: string
  description: string
  starts_at: Date | string
  ends_at: Date | string | null
  location_name: string
  address: string | null
  latitude: string | number | null
  longitude: string | number | null
  price_amount: string | number | null
  capacity: number | null
  image_object_key: string | null
  status: EventStatus
  organizer_name: string
  participant_count: string | number
  category_names: string[] | null
  viewer_participation: ParticipationStatus | null
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function toOptionalNumber(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined) {
    return undefined
  }
  return typeof value === 'number' ? value : Number(value)
}

export function mapEventRow(row: EventRow): EventSummary {
  const endsAt = row.ends_at ? toIso(row.ends_at) : undefined
  const latitude = toOptionalNumber(row.latitude)
  const longitude = toOptionalNumber(row.longitude)
  const priceAmount = toOptionalNumber(row.price_amount)
  const participantCount = Number(row.participant_count)

  return {
    id: String(row.id),
    title: row.title,
    description: row.description,
    startsAt: toIso(row.starts_at),
    ...(endsAt ? { endsAt } : {}),
    locationName: row.location_name,
    ...(row.address ? { address: row.address } : {}),
    ...(latitude !== undefined && !Number.isNaN(latitude) ? { latitude } : {}),
    ...(longitude !== undefined && !Number.isNaN(longitude) ? { longitude } : {}),
    categoryNames: row.category_names ?? [],
    ...(row.image_object_key ? { imageUrl: row.image_object_key } : {}),
    ...(priceAmount !== undefined && !Number.isNaN(priceAmount) ? { priceAmount } : {}),
    ...(row.capacity !== null && row.capacity !== undefined ? { capacity: row.capacity } : {}),
    status: row.status,
    organizerName: row.organizer_name,
    participantCount,
    ...(row.viewer_participation ? { viewerParticipation: row.viewer_participation } : {}),
  }
}
