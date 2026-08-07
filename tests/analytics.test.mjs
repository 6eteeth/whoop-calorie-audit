import { test } from 'vitest'
import assert from 'node:assert/strict'

import { calculateMetrics, caloriesFromMacros, weeklyWeightAverages, weightTrend } from '../src/lib/analytics.js'

const entries = Array.from({ length: 14 }, (_, day) => ({
  entry_date: `2026-07-${String(day + 1).padStart(2, '0')}`,
  weight_lb: 180 - (day * 0.1),
  calories_eaten: 2200,
}))

test('caloriesFromMacros applies the shared 4/4/9 formula', () => {
  assert.equal(caloriesFromMacros(250, 180, 70), 2350)
})

test('weightTrend uses every weigh-in to recover the daily slope', () => {
  assert.ok(Math.abs(weightTrend(entries) + 0.1) < 1e-12)
})

test('calculateMetrics resists noisy endpoint weigh-ins', () => {
  const noisyEntries = entries.map((entry, index) => ({
    ...entry,
    weight_lb: entry.weight_lb + (index === 0 ? 2 : index === entries.length - 1 ? -2 : 0),
  }))

  const metrics = calculateMetrics(noisyEntries)
  const baseline = calculateMetrics(entries)
  const rawEndpointImpact = 4 * 3500 / (entries.length - 1)

  assert.equal(metrics.ready, true)
  assert.ok(Math.abs(metrics.estimatedActual - baseline.estimatedActual) < rawEndpointImpact / 2)
})

test('calculateMetrics provides the shared 14-day TDEE estimate', () => {
  const metrics = calculateMetrics(entries)

  assert.equal(metrics.ready, true)
  assert.equal(metrics.sampleDays, 14)
  assert.ok(Math.abs(metrics.estimatedActual - 2550) < 1e-9)
})

test('weightTrend accounts for gaps between logged calendar days', () => {
  const rows = [
    { entry_date: '2026-01-01', weight_lb: 180 },
    { entry_date: '2026-01-03', weight_lb: 179 },
    { entry_date: '2026-01-07', weight_lb: 177 },
  ]

  assert.ok(Math.abs(weightTrend(rows) + 0.5) < 1e-12)
})

test('weeklyWeightAverages groups Sunday through Saturday and skips missing weights', () => {
  const averages = weeklyWeightAverages([
    { entry_date: '2026-08-01', weight_lb: 180 },
    { entry_date: '2026-08-02', weight_lb: 179 },
    { entry_date: '2026-08-04', weight_lb: '' },
    { entry_date: '2026-08-08', weight_lb: 177 },
    { entry_date: '2026-08-09', weight_lb: 176 },
  ])

  assert.deepEqual(averages, [
    { week: '2026-07-26', average: 180, days: 1 },
    { week: '2026-08-02', average: 178, days: 2 },
    { week: '2026-08-09', average: 176, days: 1 },
  ])
})
