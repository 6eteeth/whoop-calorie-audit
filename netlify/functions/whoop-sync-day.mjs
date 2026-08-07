import { adminClient, authenticatedUser, dateWithOffset, json, validAccessToken, whoopFetch, whoopFetchAll, workoutRow } from './_whoop-utils.mjs'

export { workoutRow } from './_whoop-utils.mjs'

const kcal = kj => kj == null ? null : Math.round(Number(kj) / 4.184)
const minutes = millis => millis == null ? null : Math.round(Number(millis) / 60000)

function queryWindow(date) {
  const start = new Date(`${date}T00:00:00.000Z`)
  const end = new Date(`${date}T00:00:00.000Z`)
  start.setUTCDate(start.getUTCDate() - 2)
  end.setUTCDate(end.getUTCDate() + 3)
  return `?limit=25&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`
}

function offsetMinutes(offset = '+00:00') {
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(offset || '')
  if (!match) return 0
  const value = Number(match[2]) * 60 + Number(match[3])
  return match[1] === '-' ? -value : value
}

function selectedLocalNoonUtc(date, offset) {
  return new Date(new Date(`${date}T12:00:00.000Z`).getTime() - offsetMinutes(offset) * 60000)
}

function effectiveOffset(cycle, clientOffset) {
  return cycle?.timezone_offset || clientOffset || '+00:00'
}

function cycleRank(cycle, date, clientOffset) {
  if (!cycle?.start) return -1
  const offset = effectiveOffset(cycle, clientOffset)
  const localStart = dateWithOffset(cycle.start, offset)
  const localEnd = cycle.end ? dateWithOffset(cycle.end, offset) : null
  const noon = selectedLocalNoonUtc(date, offset).getTime()
  const startTime = new Date(cycle.start).getTime()
  const endTime = cycle.end ? new Date(cycle.end).getTime() : Number.POSITIVE_INFINITY
  const overlapsNoon = startTime <= noon && noon < endTime

  // A selected calendar day should use the physiological cycle that STARTED on
  // that local day, including the current in-progress cycle. Never substitute
  // the previous completed cycle merely because today's totals are unfinished.
  if (localStart === date) return cycle.score_state === 'SCORED' ? 500 : 450
  if (overlapsNoon) return cycle.score_state === 'SCORED' ? 300 : 250
  if (localEnd === date && cycle.score_state === 'SCORED') return 100
  return -1
}

export function selectCycle(cycles, date, clientOffset) {
  const ranked = (cycles || [])
    .map(cycle => ({ cycle, rank: cycleRank(cycle, date, clientOffset) }))
    .filter(item => item.rank >= 0)
    .sort((a, b) => b.rank - a.rank || new Date(b.cycle.start) - new Date(a.cycle.start))

  // Only accept a cycle whose local start date exactly matches the selected day.
  // This prevents the current active cycle from leaking into a historical day.
  const exact = ranked.find(({ cycle }) => dateWithOffset(cycle.start, effectiveOffset(cycle, clientOffset)) === date)
  return exact?.cycle || null
}

export function selectCalorieCycle(cycles, date, clientOffset) {
  return (cycles || [])
    .filter(cycle => cycle?.end && dateWithOffset(cycle.end, effectiveOffset(cycle, clientOffset)) === date)
    .sort((a, b) => Number(b.score_state === 'SCORED') - Number(a.score_state === 'SCORED') || new Date(b.end) - new Date(a.end))[0] || null
}

export function dayRow(cycle, calorieCycle, recovery, sleep, userId, selectedDate) {
  const stage = sleep?.score?.stage_summary || {}
  const sleepNeeded = sleep?.score?.sleep_needed || {}
  const actualSleepMillis = Number(stage.total_light_sleep_time_milli || 0) + Number(stage.total_slow_wave_sleep_time_milli || 0) + Number(stage.total_rem_sleep_time_milli || 0)
  return {
    user_id: userId,
    cycle_id: cycle.id,
    metric_date: selectedDate,
    cycle_start: cycle.start,
    cycle_end: cycle.end,
    timezone_offset: cycle.timezone_offset,
    cycle_score_state: cycle.score_state,
    strain: cycle.score?.strain ?? null,
    total_kilojoule: calorieCycle?.score?.kilojoule ?? null,
    total_calories: kcal(calorieCycle?.score?.kilojoule),
    average_heart_rate: cycle.score?.average_heart_rate ?? null,
    max_heart_rate: cycle.score?.max_heart_rate ?? null,
    recovery_score: recovery?.score?.recovery_score ?? null,
    resting_heart_rate: recovery?.score?.resting_heart_rate ?? null,
    hrv_rmssd_milli: recovery?.score?.hrv_rmssd_milli ?? null,
    spo2_percentage: recovery?.score?.spo2_percentage ?? null,
    skin_temp_celsius: recovery?.score?.skin_temp_celsius ?? null,
    sleep_id: sleep?.id ?? null,
    sleep_start: sleep?.start ?? null,
    sleep_end: sleep?.end ?? null,
    sleep_duration_minutes: actualSleepMillis ? minutes(actualSleepMillis) : null,
    time_in_bed_minutes: minutes(stage.total_in_bed_time_milli),
    awake_minutes: minutes(stage.total_awake_time_milli),
    light_sleep_minutes: minutes(stage.total_light_sleep_time_milli),
    slow_wave_sleep_minutes: minutes(stage.total_slow_wave_sleep_time_milli),
    rem_sleep_minutes: minutes(stage.total_rem_sleep_time_milli),
    sleep_performance_percentage: sleep?.score?.sleep_performance_percentage ?? null,
    sleep_efficiency_percentage: sleep?.score?.sleep_efficiency_percentage ?? null,
    sleep_consistency_percentage: sleep?.score?.sleep_consistency_percentage ?? null,
    respiratory_rate: sleep?.score?.respiratory_rate ?? null,
    disturbance_count: stage.disturbance_count ?? null,
    sleep_cycle_count: stage.sleep_cycle_count ?? null,
    sleep_needed_minutes: sleepNeeded.baseline_milli == null ? null : minutes(Number(sleepNeeded.baseline_milli || 0) + Number(sleepNeeded.need_from_sleep_debt_milli || 0) + Number(sleepNeeded.need_from_recent_strain_milli || 0) + Number(sleepNeeded.need_from_recent_nap_milli || 0)),
    raw_cycle: cycle,
    raw_recovery: recovery || null,
    raw_sleep: sleep || null,
    updated_at: new Date().toISOString(),
  }
}

export default async req => {
  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    const user = await authenticatedUser(req)
    if (!user) return json({ error: 'Unauthorized' }, 401)
    const { date, timezone_offset: clientOffset } = await req.json().catch(() => ({}))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return json({ error: 'A valid date is required.' }, 400)

    const admin = adminClient()
    const { data: connection, error: connectionError } = await admin.from('whoop_connections').select('*').eq('user_id', user.id).single()
    if (connectionError || !connection) return json({ error: 'WHOOP is not connected.' }, 400)
    const accessToken = await validAccessToken(admin, connection)
    const window = queryWindow(date)
    const [cycles, workoutRecords] = await Promise.all([
      whoopFetchAll(`/v2/cycle${window}`, accessToken),
      whoopFetchAll(`/v2/activity/workout${window}`, accessToken),
    ])

    const cycle = selectCycle(cycles, date, clientOffset)
    const calorieCycle = selectCalorieCycle(cycles, date, clientOffset)
    const workouts = workoutRecords.map(w => workoutRow(w, user.id)).filter(w => w.workout_date === date).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))

    if (workouts.length) {
      const { error } = await admin.from('whoop_workouts').upsert(workouts, { onConflict: 'id' })
      if (error) throw error
    }

    let day = null
    if (cycle) {
      const [recovery, sleep] = await Promise.all([
        whoopFetch(`/v2/cycle/${cycle.id}/recovery`, accessToken).catch(error => error.message.includes('404') ? null : Promise.reject(error)),
        whoopFetch(`/v2/cycle/${cycle.id}/sleep`, accessToken).catch(error => error.message.includes('404') ? null : Promise.reject(error)),
      ])
      day = dayRow({ ...cycle, timezone_offset: effectiveOffset(cycle, clientOffset) }, calorieCycle, recovery, sleep, user.id, date)
      const { error } = await admin.from('whoop_daily_metrics').upsert(day, { onConflict: 'user_id,cycle_id' })
      if (error) throw error
    }

    await admin.from('whoop_connections').update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', user.id)

    console.log(JSON.stringify({
      event: 'whoop-selected-day-sync',
      requested_date: date,
      client_timezone_offset: clientOffset || null,
      matched_cycle_id: cycle?.id || null,
      matched_cycle_start: cycle?.start || null,
      matched_cycle_end: cycle?.end || null,
      matched_cycle_offset: cycle ? effectiveOffset(cycle, clientOffset) : null,
      matched_cycle_local_start: cycle ? dateWithOffset(cycle.start, effectiveOffset(cycle, clientOffset)) : null,
      matched_cycle_score_state: cycle?.score_state || null,
      calorie_cycle_id: calorieCycle?.id || null,
      calorie_cycle_start: calorieCycle?.start || null,
      calorie_cycle_end: calorieCycle?.end || null,
      calorie_cycle_local_end: calorieCycle ? dateWithOffset(calorieCycle.end, effectiveOffset(calorieCycle, clientOffset)) : null,
      calorie_cycle_kilojoules: calorieCycle?.score?.kilojoule ?? null,
      calorie_cycle_calories: kcal(calorieCycle?.score?.kilojoule),
    }))

    return json({
      ok: true,
      date,
      day,
      workouts,
      steps_available: false,
      warning: !cycle ? 'No WHOOP physiological cycle could be matched to this date. Workout data may still be available.' : cycle.score_state !== 'SCORED' ? 'Today’s WHOOP totals are still in progress and may change until the physiological cycle closes.' : null,
    })
  } catch (error) {
    console.error(error)
    return json({ error: error.message }, 500)
  }
}
