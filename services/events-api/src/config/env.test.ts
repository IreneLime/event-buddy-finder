import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { isDevAuthEnabled } from './env.js'

describe('isDevAuthEnabled', () => {
  it('is off by default', () => {
    assert.equal(isDevAuthEnabled({}), false)
  })

  it('is opt-in for local development without Firebase', () => {
    assert.equal(
      isDevAuthEnabled({
        allowDevAuth: 'true',
        nodeEnv: 'development',
      }),
      true,
    )
  })

  it('stays off in production even when requested', () => {
    assert.equal(
      isDevAuthEnabled({
        allowDevAuth: 'true',
        nodeEnv: 'production',
      }),
      false,
    )
  })

  it('stays off when Firebase is configured', () => {
    assert.equal(
      isDevAuthEnabled({
        allowDevAuth: 'true',
        nodeEnv: 'development',
        firebaseProjectId: 'event-buddy',
      }),
      false,
    )
  })
})
