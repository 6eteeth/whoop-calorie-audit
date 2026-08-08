import { test } from 'vitest'
import assert from 'node:assert/strict'

import { streakFor } from '../netlify/functions/admin-overview.mjs'

const entriesFor = dates => dates.map(entry_date => ({ entry_date }))

test('streakFor counts a streak ending today or yesterday', () => {
  const now = new Date('2026-08-08T20:00:00Z')

  assert.equal(streakFor(entriesFor(['2026-08-08', '2026-08-07', '2026-08-06']), now), 3)
  assert.equal(streakFor(entriesFor(['2026-08-07', '2026-08-06']), now), 2)
})

test('streakFor returns zero when the newest entry is stale', () => {
  const now = new Date('2026-08-08T20:00:00Z')

  assert.equal(streakFor(entriesFor(['2026-02-03', '2026-02-02', '2026-02-01']), now), 0)
})

test('streakFor does not count future-dated entries as current', () => {
  const now = new Date('2026-08-08T20:00:00Z')

  assert.equal(streakFor(entriesFor(['2026-08-09', '2026-08-08']), now), 0)
})
