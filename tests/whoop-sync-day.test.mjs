import test from 'node:test'
import assert from 'node:assert/strict'
import { dayRow, selectCalorieCycle, selectCycle, workoutRow } from '../netlify/functions/whoop-sync-day.mjs'

const recovery = { score: { recovery_score: 81, resting_heart_rate: 52, hrv_rmssd_milli: 64 } }
const sleep = { score: { stage_summary: { total_light_sleep_time_milli: 14400000, total_slow_wave_sleep_time_milli: 5400000, total_rem_sleep_time_milli: 7200000 } } }

function cycle({ id, start, end, offset, kilojoule, strain, scoreState = 'SCORED' }) {
  return {
    id,
    start,
    end,
    timezone_offset: offset,
    score_state: scoreState,
    score: { kilojoule, strain, average_heart_rate: 70, max_heart_rate: 150 },
  }
}

test('maps Aug 4 WHOOP metrics to Aug 4 and its completed calories only to Aug 5 in Pacific time', () => {
  const aug4 = cycle({
    id: 'pacific-aug-4',
    start: '2026-08-04T14:00:00.000Z',
    end: '2026-08-05T14:15:00.000Z',
    offset: '-07:00',
    kilojoule: 10460,
    strain: 12.4,
  })
  const aug5 = cycle({
    id: 'pacific-aug-5',
    start: '2026-08-05T14:15:00.000Z',
    end: '2026-08-06T14:10:00.000Z',
    offset: '-07:00',
    kilojoule: 11297,
    strain: 14.1,
  })
  const cycles = [aug4, aug5]

  const primaryAug4 = selectCycle(cycles, '2026-08-04', '-07:00')
  const caloriesAug4 = selectCalorieCycle(cycles, '2026-08-04', '-07:00')
  const caloriesAug5 = selectCalorieCycle(cycles, '2026-08-05', '-07:00')
  const aug4Row = dayRow(primaryAug4, caloriesAug4, recovery, sleep, 'user-1', '2026-08-04')
  const aug5Row = dayRow(selectCycle(cycles, '2026-08-05', '-07:00'), caloriesAug5, recovery, sleep, 'user-1', '2026-08-05')

  assert.equal(primaryAug4.id, 'pacific-aug-4')
  assert.equal(aug4Row.metric_date, '2026-08-04')
  assert.equal(aug4Row.strain, 12.4)
  assert.equal(aug4Row.recovery_score, 81)
  assert.equal(aug4Row.sleep_duration_minutes, 450)
  assert.equal(aug4Row.total_calories, null)
  assert.equal(caloriesAug5.id, 'pacific-aug-4')
  assert.equal(aug5Row.total_kilojoule, 10460)
  assert.equal(aug5Row.total_calories, 2500)
})

test('matches calorie cycle end dates in Eastern time and prefers a scored cycle', () => {
  const unscored = cycle({
    id: 'eastern-unscored',
    start: '2026-08-05T01:00:00.000Z',
    end: '2026-08-06T02:00:00.000Z',
    offset: '-04:00',
    kilojoule: 9000,
    strain: 10,
    scoreState: 'PENDING_SCORE',
  })
  const scored = cycle({
    id: 'eastern-scored',
    start: '2026-08-05T02:00:00.000Z',
    end: '2026-08-06T03:00:00.000Z',
    offset: '-04:00',
    kilojoule: 8368,
    strain: 11,
  })

  assert.equal(selectCalorieCycle([unscored, scored], '2026-08-05', '-04:00').id, 'eastern-scored')
  assert.equal(selectCalorieCycle([unscored, scored], '2026-08-04', '-04:00'), null)
})

test('keeps workout mapping based on the workout local start date', () => {
  const workout = workoutRow({
    id: 'workout-1',
    user_id: 99,
    start: '2026-08-05T02:30:00.000Z',
    end: '2026-08-05T03:30:00.000Z',
    timezone_offset: '-07:00',
    sport_id: 1,
    sport_name: 'Running',
    score_state: 'SCORED',
    score: { kilojoule: 2092, strain: 9, average_heart_rate: 140, max_heart_rate: 170 },
  }, 'user-1')

  assert.equal(workout.workout_date, '2026-08-04')
  assert.equal(workout.calories, 500)
  assert.equal(workout.duration_minutes, 60)
})
