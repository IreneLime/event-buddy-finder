import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildEventListFilters } from './event.filters.js'
import type { EventListQueryInput } from './event.validation.js'

const baseQuery: EventListQueryInput = {
  page: 1,
  limit: 20,
  status: 'scheduled',
  sortBy: 'startsAt',
  order: 'asc',
}

describe('buildEventListFilters', () => {
  it('starts count-query filters at $1 so Postgres can type every parameter', () => {
    const { filters, values } = buildEventListFilters(baseQuery, 1)

    assert.deepEqual(values, ['scheduled'])
    assert.equal(filters[0], 'e.status = $1')
    assert.ok(!filters.some((filter) => filter.includes('$2')))
  })

  it('starts list-query filters at $2 when $1 is reserved for the viewer', () => {
    const { filters, values } = buildEventListFilters(
      { ...baseQuery, search: 'badminton', category: 'Sports' },
      2,
    )

    assert.deepEqual(values, ['scheduled', '%badminton%', 'Sports'])
    assert.equal(filters[0], 'e.status = $2')
    assert.match(filters[1]!, /\$3/)
    assert.match(filters[2]!, /\$4/)
  })
})
