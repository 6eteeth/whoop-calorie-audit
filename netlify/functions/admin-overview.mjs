import { adminClient, authenticatedUser, json } from './_whoop-utils.mjs'

const dayKey = value => new Date(value).toISOString().slice(0, 10)
const monthKey = value => new Date(value).toISOString().slice(0, 7)
const daysAgo = days => new Date(Date.now() - days * 86400000)
const average = values => values.length ? values.reduce((a,b) => a + b, 0) / values.length : null
const calendarDay = date => Date.UTC(...date.split('-').map((value, index) => index === 1 ? Number(value) - 1 : Number(value))) / 86400000
const TDEE_DAYS = 14
const PAGE_SIZE = 1000

async function allRows(queryPage) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await queryPage(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data || []))
    if ((data || []).length < PAGE_SIZE) return rows
  }
}

function weightTrend(rows) {
  if (rows.length < 2) return null
  const startDay = calendarDay(rows[0].entry_date)
  const points = rows.map(row => ({ day: calendarDay(row.entry_date) - startDay, weight: Number(row.weight_lb) }))
  const meanDay = average(points.map(point => point.day))
  const meanWeight = average(points.map(point => point.weight))
  const dayVariance = points.reduce((sum, point) => sum + ((point.day - meanDay) ** 2), 0)
  if (!dayVariance) return null
  return points.reduce((sum, point) => sum + ((point.day - meanDay) * (point.weight - meanWeight)), 0) / dayVariance
}

function streakFor(entries) {
  const dates = [...new Set(entries.map(x => x.entry_date))].sort().reverse()
  if (!dates.length) return 0
  let streak = 1
  for (let i = 1; i < dates.length; i++) {
    const newer = new Date(`${dates[i-1]}T12:00:00Z`)
    const older = new Date(`${dates[i]}T12:00:00Z`)
    if (Math.round((newer - older) / 86400000) === 1) streak += 1
    else break
  }
  return streak
}

function userTdee(entries) {
  const rows = entries.filter(x => x.weight_lb != null && x.calories_eaten != null).sort((a,b) => a.entry_date.localeCompare(b.entry_date)).slice(-TDEE_DAYS)
  if (rows.length < TDEE_DAYS) return null
  const avgIntake = average(rows.map(x => Number(x.calories_eaten)))
  return avgIntake - (weightTrend(rows) * 3500)
}

export default async function handler(req) {
  try {
    const user = await authenticatedUser(req)
    if (!user) return json({ error: 'Unauthorized' }, 401)
    const admin = adminClient()
    const { data: adminRow } = await admin.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!adminRow) return json({ error: 'Forbidden' }, 403)
    if (new URL(req.url).searchParams.get('check') === '1') return json({ admin: true })

    const authUsers = []
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) throw error
      authUsers.push(...(data.users || []))
      if ((data.users || []).length < 1000) break
    }

    const [profiles, preferences, connections, entries] = await Promise.all([
      allRows((from, to) => admin.from('profiles').select('user_id,first_name,last_name').order('user_id').range(from, to)),
      allRows((from, to) => admin.from('user_preferences').select('user_id,wearable_provider').order('user_id').range(from, to)),
      allRows((from, to) => admin.from('whoop_connections').select('user_id,last_synced_at').order('user_id').range(from, to)),
      allRows((from, to) => admin.from('daily_entries').select('user_id,entry_date,weight_lb,calories_eaten,used_ai_calorie_estimate,alcohol_consumed,caffeine_after_3pm,workout_1_type,workout_2_type,workout_3_type,created_at').order('user_id').order('entry_date').range(from, to)),
    ])

    const profileMap = new Map(profiles.map(x => [x.user_id, x]))
    const prefMap = new Map(preferences.map(x => [x.user_id, x]))
    const connMap = new Map(connections.map(x => [x.user_id, x]))
    const entriesByUser = new Map()
    for (const entry of entries) {
      const rows = entriesByUser.get(entry.user_id) || []
      rows.push(entry)
      entriesByUser.set(entry.user_id, rows)
    }

    const now = new Date()
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startWeek = daysAgo(7)
    const startMonth = daysAgo(30)
    const startCalendarMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const users = authUsers.map(u => {
      const profile = profileMap.get(u.id) || {}
      const pref = prefMap.get(u.id) || {}
      const conn = connMap.get(u.id)
      const rows = entriesByUser.get(u.id) || []
      const lastActivity = rows.length ? new Date(`${rows.map(x => x.entry_date).sort().at(-1)}T23:59:59`) : null
      return {
        id: u.id,
        first_name: profile.first_name || u.user_metadata?.first_name || '',
        last_name: profile.last_name || u.user_metadata?.last_name || '',
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        wearable_connected: Boolean(conn),
        wearable_provider: conn ? 'WHOOP' : (pref.wearable_provider && pref.wearable_provider !== 'none' ? pref.wearable_provider : null),
        last_wearable_sync: conn?.last_synced_at || null,
        daily_entries: rows.length,
        logging_streak: streakFor(rows),
        active_last_7_days: Boolean(lastActivity && lastActivity >= startWeek),
        active_last_30_days: Boolean(lastActivity && lastActivity >= startMonth),
      }
    })

    const tdees = [...entriesByUser.values()].map(userTdee).filter(Number.isFinite)
    const weightChanges = [...entriesByUser.values()].map(rows => {
      const weighted = rows.filter(x => x.weight_lb != null).sort((a,b) => a.entry_date.localeCompare(b.entry_date))
      const elapsed = weighted.length >= 2 ? calendarDay(weighted.at(-1).entry_date) - calendarDay(weighted[0].entry_date) : 0
      const trend = weightTrend(weighted)
      return trend == null ? null : trend * elapsed
    }).filter(Number.isFinite)

    const monthly = new Map()
    authUsers.forEach(u => monthly.set(monthKey(u.created_at), (monthly.get(monthKey(u.created_at)) || 0) + 1))
    const dau = new Map()
    ;(entries || []).forEach(e => {
      const set = dau.get(e.entry_date) || new Set()
      set.add(e.user_id)
      dau.set(e.entry_date, set)
    })
    const wearables = new Map([['None', 0], ['WHOOP', 0], ['Other', 0]])
    users.forEach(u => {
      if (u.wearable_provider === 'WHOOP') wearables.set('WHOOP', wearables.get('WHOOP') + 1)
      else if (u.wearable_provider) wearables.set('Other', wearables.get('Other') + 1)
      else wearables.set('None', wearables.get('None') + 1)
    })
    const workoutCounts = new Map()
    for (const e of entries || []) for (const key of ['workout_1_type','workout_2_type','workout_3_type']) {
      const type = e[key]
      if (type && type !== 'None') workoutCounts.set(type, (workoutCounts.get(type) || 0) + 1)
    }

    return json({
      summary: {
        total_users: users.length,
        daily_active_users: (dau.get(dayKey(now)) || new Set()).size,
        weekly_active_users: users.filter(u => u.active_last_7_days).length,
        monthly_active_users: users.filter(u => u.active_last_30_days).length,
        new_users_this_month: authUsers.filter(u => new Date(u.created_at) >= startCalendarMonth).length,
        wearables_connected: users.filter(u => u.wearable_connected).length,
        average_logging_streak: average(users.map(u => u.logging_streak)) || 0,
        average_logged_days: average(users.map(u => u.daily_entries)) || 0,
        users_with_tdee_ready: tdees.length,
        average_calculated_tdee: average(tdees),
        average_weight_change_lb: average(weightChanges),
        total_daily_logs: (entries || []).length,
      },
      users,
      trends: {
        monthly_signups: [...monthly.entries()].sort().slice(-12).map(([month,count]) => ({ month, count })),
        daily_active_users: [...dau.entries()].sort().slice(-30).map(([date,set]) => ({ date, count: set.size })),
      },
      breakdowns: {
        wearables: [...wearables.entries()].map(([provider,count]) => ({ provider, count })),
        workout_types: [...workoutCounts.entries()].sort((a,b) => b[1]-a[1]).slice(0,8).map(([type,count]) => ({ type, count })),
        ai_estimated_days: (entries || []).filter(x => x.used_ai_calorie_estimate).length,
        alcohol_days: (entries || []).filter(x => x.alcohol_consumed).length,
        late_caffeine_days: (entries || []).filter(x => x.caffeine_after_3pm).length,
      },
    })
  } catch (error) {
    return json({ error: error.message || 'Admin analytics failed' }, 500)
  }
}
