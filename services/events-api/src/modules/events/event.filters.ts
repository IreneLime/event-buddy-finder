import type { EventListQueryInput } from './event.validation.js'

/**
 * Builds WHERE clause fragments for event listing.
 * `startParam` is the first `$n` index to use (1 for count queries, 2 when $1 is the viewer).
 */
export function buildEventListFilters(
  query: EventListQueryInput,
  startParam: number,
): { filters: string[]; values: unknown[] } {
  const values: unknown[] = []
  const filters: string[] = []
  let param = startParam

  const alloc = (value: unknown): string => {
    values.push(value)
    const placeholder = `$${param}`
    param += 1
    return placeholder
  }

  filters.push(`e.status = ${alloc(query.status)}`)

  if (query.search) {
    const placeholder = alloc(`%${query.search}%`)
    filters.push(
      `(e.title ILIKE ${placeholder} OR e.description ILIKE ${placeholder} OR e.location_name ILIKE ${placeholder} OR COALESCE(e.city, '') ILIKE ${placeholder} OR COALESCE(e.notes, '') ILIKE ${placeholder})`,
    )
  }

  if (query.category) {
    const placeholder = alloc(query.category)
    filters.push(`e.category_names @> ARRAY[${placeholder}]::text[]`)
  }

  if (query.startDate) {
    filters.push(`e.starts_at >= ${alloc(query.startDate)}`)
  }

  if (query.endDate) {
    filters.push(`e.starts_at <= ${alloc(query.endDate)}`)
  }

  if (query.location) {
    const placeholder = alloc(`%${query.location}%`)
    filters.push(
      `(e.location_name ILIKE ${placeholder} OR COALESCE(e.address, '') ILIKE ${placeholder} OR COALESCE(e.city, '') ILIKE ${placeholder})`,
    )
  }

  if (query.city) {
    filters.push(`e.city ILIKE ${alloc(query.city)}`)
  }

  return { filters, values }
}
