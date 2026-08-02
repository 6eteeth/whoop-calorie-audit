import { adminClient, authenticatedUser, json } from './_whoop-utils.mjs'

export default async req => {
  try {
    const user = await authenticatedUser(req)
    if (!user) return json({ error: 'Unauthorized' }, 401)
    const admin = adminClient()
    const { data: connection } = await admin.from('whoop_connections').select('whoop_user_id,whoop_email,whoop_first_name,whoop_last_name,scope,connected_at,last_synced_at').eq('user_id', user.id).maybeSingle()
    if (!connection) return json({ connected: false })
    const { data: workouts } = await admin.from('whoop_workouts').select('*').eq('user_id', user.id).order('start_time', { ascending: false }).limit(12)
    const { data: days } = await admin.from('whoop_daily_metrics').select('*').eq('user_id', user.id).order('metric_date', { ascending: false }).limit(14)
    return json({ connected: true, connection, workouts: workouts || [], days: days || [] })
  } catch (error) { return json({ error: error.message }, 500) }
}
