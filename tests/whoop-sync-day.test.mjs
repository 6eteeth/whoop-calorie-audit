import { test } from 'vitest'
import assert from 'node:assert/strict'
import { workoutRow } from '../netlify/functions/_whoop-utils.mjs'
import { dayRow, mergeCycles, selectCycle } from '../netlify/functions/whoop-sync-day.mjs'

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

test('maps every WHOOP cycle metric to the local day when the cycle started', () => {
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
  const aug4Row = dayRow(primaryAug4, recovery, sleep, 'user-1', '2026-08-04')
  const aug5Row = dayRow(selectCycle(cycles, '2026-08-05', '-07:00'), recovery, sleep, 'user-1', '2026-08-05')

  assert.equal(primaryAug4.id, 'pacific-aug-4')
  assert.equal(aug4Row.metric_date, '2026-08-04')
  assert.equal(aug4Row.strain, 12.4)
  assert.equal(aug4Row.recovery_score, 81)
  assert.equal(aug4Row.sleep_duration_minutes, 450)
  assert.equal(aug4Row.total_kilojoule, 10460)
  assert.equal(aug4Row.total_calories, 2500)
  assert.equal(aug5Row.total_kilojoule, 11297)
  assert.equal(aug5Row.total_calories, 2700)
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


test('selectCycle only considers cycles that start on the requested local day', () => {
  const exact = cycle({ id: 'exact', start: '2026-08-05T14:00:00.000Z', end: '2026-08-06T14:00:00.000Z', offset: '-07:00', scoreState: 'PENDING_SCORE' })
  const overlap = cycle({ id: 'overlap', start: '2026-08-04T14:00:00.000Z', end: '2026-08-05T20:00:00.000Z', offset: '-07:00' })

  assert.equal(selectCycle([overlap, exact], '2026-08-05', '-07:00').id, 'exact')
  assert.equal(selectCycle([overlap], '2026-08-05', '-07:00'), null)
})

test('uses the requested local offset when WHOOP reports a conflicting cycle offset', () => {
  const aug8 = cycle({
    id: 'aug-8-conflicting-offset',
    start: '2026-08-09T02:00:00.000Z',
    end: '2026-08-10T02:00:00.000Z',
    offset: '+00:00',
    kilojoule: 10460,
    strain: 12.4,
  })

  const selected = selectCycle([aug8], '2026-08-08', '-04:00')

  assert.equal(selected.id, 'aug-8-conflicting-offset')
  assert.equal(selectCycle([aug8], '2026-08-09', '-04:00'), null)
})

test('combines fallback results without duplicating cycles from the date window', () => {
  const windowCycle = cycle({ id: 'window-cycle', start: '2026-08-07T12:00:00.000Z', end: '2026-08-08T12:00:00.000Z', offset: '-03:00' })
  const selectedDayCycle = cycle({ id: 'selected-cycle', start: '2026-08-08T12:00:00.000Z', end: '2026-08-09T12:00:00.000Z', offset: '-03:00' })
  const duplicate = { ...windowCycle, score_state: 'SCORED' }

  const combined = mergeCycles([windowCycle], [duplicate, selectedDayCycle])

  assert.deepEqual(combined.map(item => item.id), ['window-cycle', 'selected-cycle'])
  assert.equal(combined[0].score_state, 'SCORED')
  assert.equal(selectCycle(combined, '2026-08-08', '-03:00').id, 'selected-cycle')
})
