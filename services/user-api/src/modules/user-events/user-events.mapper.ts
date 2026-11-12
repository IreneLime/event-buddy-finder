import type { EventStatus, EventSummary } from '@event-buddy/contracts'

export interface UserEventRow {
  id: string | number
  title: string
  description: string
  starts_at: Date | string
  ends_at: Date | string | null
  location_name: string
  address: string | null
  price_amount: string | number | null
  capacity: number | null
  status: EventStatus
  organizer_name: string
  participant_count: string | number
  category_names: string[] | null
}

const toIso = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString()

export function mapUserEvent(row: UserEventRow): EventSummary {
  const priceAmount = row.price_amount === null ? undefined : Number(row.price_amount)
  return {
    id: String(row.id),
    title: row.title,
    description: row.description,
    startsAt: toIso(row.starts_at),
    ...(row.ends_at ? { endsAt: toIso(row.ends_at) } : {}),
    locationName: row.location_name,
    ...(row.address ? { address: row.address } : {}),
    categoryNames: row.category_names ?? [],
    ...(priceAmount !== undefined && !Number.isNaN(priceAmount) ? { priceAmount } : {}),
    ...(row.capacity === null ? {} : { capacity: row.capacity }),
    status: row.status,
    organizerName: row.organizer_name,
    participantCount: Number(row.participant_count),
    viewerParticipation: 'going',
  }
}
