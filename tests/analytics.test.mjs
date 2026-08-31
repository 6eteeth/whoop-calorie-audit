import { test } from 'vitest'
import assert from 'node:assert/strict'

import { calculateMetrics, calculateTdeeModels, caloriesFromMacros, smoothWeightRows, weeklyWeightAverages, weightTrend } from '../src/lib/analytics.js'

const entries = Array.from({ length: 40 }, (_, day) => ({
  entry_date: `2026-${day < 31 ? '07' : '08'}-${String(day < 31 ? day + 1 : day - 30).padStart(2, '0')}`,
  weight_lb: 180 - (day * 0.1),
  calories_eaten: 2200,
}))

test('caloriesFromMacros applies the shared 4/4/9 formula', () => {
  assert.equal(caloriesFromMacros(250, 180, 70), 2350)
})

test('weightTrend uses every weigh-in to recover the daily slope', () => {
  assert.ok(Math.abs(weightTrend(entries) + 0.1) < 1e-12)
})

test('smoothWeightRows dampens an isolated scale spike', () => {
  const rows = [
    { entry_date: '2026-01-01', weight_lb: 180 },
    { entry_date: '2026-01-02', weight_lb: 184 },
    { entry_date: '2026-01-03', weight_lb: 180 },
  ]
  const smoothed = smoothWeightRows(rows)
  assert.ok(smoothed[1].weight_lb < 184)
  assert.ok(smoothed[2].weight_lb > 180)
})

test('calculateMetrics withholds the newest five complete days', () => {
  const baseline = calculateMetrics(entries, 30, 5)
  const highRecentIntake = entries.map((entry, index) => index >= entries.length - 5 ? { ...entry, calories_eaten: 5000 } : entry)
  const changed = calculateMetrics(highRecentIntake, 30, 5)

  assert.equal(changed.ready, true)
  assert.equal(changed.avgIntake, baseline.avgIntake)
  assert.equal(changed.estimatedActual, baseline.estimatedActual)
})

test('calculateTdeeModels provides 30-day and all-data estimates', () => {
  const models = calculateTdeeModels(entries, 5)

  assert.equal(models.thirtyDay.ready, true)
  assert.equal(models.thirtyDay.sampleDays, 30)
  assert.equal(models.allTime.ready, true)
  assert.equal(models.allTime.sampleDays, 35)
  assert.equal(models.thirtyDay.lagDays, 5)
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
