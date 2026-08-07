import { adminClient, authenticatedUser, dateWithOffset, json, validAccessToken, whoopFetch } from './_whoop-utils.mjs'

const kcal = kj => kj == null ? null : Math.round(Number(kj) / 4.184)
const minutes = (start, end) => Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000))

export default async req => {
  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    const user = await authenticatedUser(req)
    if (!user) return json({ error: 'Unauthorized' }, 401)
    const admin = adminClient()
    const { data: connection, error: connectionError } = await admin.from('whoop_connections').select('*').eq('user_id', user.id).single()
    if (connectionError || !connection) return json({ error: 'WHOOP is not connected.' }, 400)
    const accessToken = await validAccessToken(admin, connection)
    const start = new Date(Date.now() - 45 * 86400000).toISOString()
    const query = `?limit=25&start=${encodeURIComponent(start)}`
    const [profile, body, workoutPage, cyclePage, recoveryPage] = await Promise.all([
      whoopFetch('/v2/user/profile/basic', accessToken),
      whoopFetch('/v2/user/measurement/body', accessToken).catch(() => null),
      whoopFetch(`/v2/activity/workout${query}`, accessToken),
      whoopFetch(`/v2/cycle${query}`, accessToken),
      whoopFetch(`/v2/recovery${query}`, accessToken).catch(() => ({ records: [] })),
    ])
    const workouts = (workoutPage.records || []).map(w => ({
      id: w.id,
      user_id: user.id,
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
      duration_minutes: minutes(w.start, w.end),
      raw_data: w,
      updated_at: new Date().toISOString(),
    }))
    if (workouts.length) {
      const { error } = await admin.from('whoop_workouts').upsert(workouts, { onConflict: 'id' })
      if (error) throw error
    }
    const recoveries = new Map((recoveryPage.records || []).map(r => [String(r.cycle_id), r]))
    const days = (cyclePage.records || []).map(c => {
      const recovery = recoveries.get(String(c.id))
      return {
        user_id: user.id,
        cycle_id: c.id,
        metric_date: dateWithOffset(c.start, c.timezone_offset),
        cycle_start: c.start,
        cycle_end: c.end,
        timezone_offset: c.timezone_offset,
        cycle_score_state: c.score_state,
        strain: c.score?.strain ?? null,
        total_kilojoule: c.score?.kilojoule ?? null,
        total_calories: kcal(c.score?.kilojoule),
        average_heart_rate: c.score?.average_heart_rate ?? null,
        max_heart_rate: c.score?.max_heart_rate ?? null,
        recovery_score: recovery?.score?.recovery_score ?? null,
        resting_heart_rate: recovery?.score?.resting_heart_rate ?? null,
        hrv_rmssd_milli: recovery?.score?.hrv_rmssd_milli ?? null,
        spo2_percentage: recovery?.score?.spo2_percentage ?? null,
        skin_temp_celsius: recovery?.score?.skin_temp_celsius ?? null,
        raw_cycle: c,
        raw_recovery: recovery || null,
        updated_at: new Date().toISOString(),
      }
    })
    if (days.length) {
      const { error } = await admin.from('whoop_daily_metrics').upsert(days, { onConflict: 'user_id,cycle_id' })
      if (error) throw error
    }
    await admin.from('whoop_connections').update({
      whoop_user_id: profile.user_id,
      whoop_email: profile.email,
      whoop_first_name: profile.first_name,
      whoop_last_name: profile.last_name,
      body_measurement: body,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id)
    return json({ ok: true, workouts: workouts.length, days: days.length })
  } catch (error) {
    console.error(error)
    return json({ error: error.message }, 500)
  }
}
