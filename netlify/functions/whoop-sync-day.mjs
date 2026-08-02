import { adminClient, authenticatedUser, dateWithOffset, json, validAccessToken, whoopFetch } from './_whoop-utils.mjs'

const kcal = kj => kj == null ? null : Math.round(Number(kj) / 4.184)
const minutes = millis => millis == null ? null : Math.round(Number(millis) / 60000)
const durationMinutes = (start, end) => (!start || !end) ? null : Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000))

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

function cycleRank(cycle, date) {
  if (!cycle?.end || cycle.score_state !== 'SCORED') return -1
  const localStart = dateWithOffset(cycle.start, cycle.timezone_offset)
  const localEnd = dateWithOffset(cycle.end, cycle.timezone_offset)
  const noon = selectedLocalNoonUtc(date, cycle.timezone_offset).getTime()
  const overlapsNoon = new Date(cycle.start).getTime() <= noon && noon < new Date(cycle.end).getTime()

  // WHOOP cycles are physiological rather than calendar days. For a daily log,
  // prefer the completed cycle that begins on the selected local date, then a
  // cycle spanning local noon, with end-date matching only as a final fallback.
  if (localStart === date) return 300
  if (overlapsNoon) return 200
  if (localEnd === date) return 100
  return -1
}

function selectCycle(cycles, date) {
  return (cycles || [])
    .map(cycle => ({ cycle, rank: cycleRank(cycle, date) }))
    .filter(item => item.rank >= 0)
    .sort((a, b) => b.rank - a.rank || new Date(b.cycle.end) - new Date(a.cycle.end))[0]?.cycle || null
}

function workoutRow(w, userId) {
  return {
    id: w.id,
    user_id: userId,
    whoop_user_id: w.user_id,
    workout_date: dateWithOffset(w.start, w.timezone_offset),
    start_time: w.start,
    end_time: w.end,
    timezone_offset: w.timezone_offset,
    sport_id: w.sport_id,
    sport_name: w.sport_name || 'Workout',
    score_state: w.score_state,
    strain: w.score?.strain ?? null,
    average_heart_rate: w.score?.average_heart_rate ?? null,
    max_heart_rate: w.score?.max_heart_rate ?? null,
    kilojoule: w.score?.kilojoule ?? null,
    calories: kcal(w.score?.kilojoule),
    duration_minutes: durationMinutes(w.start, w.end),
    raw_data: w,
    updated_at: new Date().toISOString(),
  }
}

function dayRow(cycle, recovery, sleep, userId, selectedDate) {
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
    total_kilojoule: cycle.score?.kilojoule ?? null,
    total_calories: kcal(cycle.score?.kilojoule),
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
    const { date } = await req.json().catch(() => ({}))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return json({ error: 'A valid date is required.' }, 400)

    const admin = adminClient()
    const { data: connection, error: connectionError } = await admin.from('whoop_connections').select('*').eq('user_id', user.id).single()
    if (connectionError || !connection) return json({ error: 'WHOOP is not connected.' }, 400)
    const accessToken = await validAccessToken(admin, connection)
    const window = queryWindow(date)
    const [cyclePage, workoutPage] = await Promise.all([
      whoopFetch(`/v2/cycle${window}`, accessToken),
      whoopFetch(`/v2/activity/workout${window}`, accessToken),
    ])

    const cycle = selectCycle(cyclePage.records || [], date)
    const workouts = (workoutPage.records || []).map(w => workoutRow(w, user.id)).filter(w => w.workout_date === date).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))

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
      day = dayRow(cycle, recovery, sleep, user.id, date)
      const { error } = await admin.from('whoop_daily_metrics').upsert(day, { onConflict: 'user_id,cycle_id' })
      if (error) throw error
    }

    await admin.from('whoop_connections').update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', user.id)

    return json({
      ok: true,
      date,
      day,
      workouts,
      steps_available: false,
      warning: !cycle ? 'No completed, scored WHOOP physiological cycle could be matched to this date. Workout data may still be available.' : null,
    })
  } catch (error) {
    console.error(error)
    return json({ error: error.message }, 500)
  }
}
