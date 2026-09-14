import { adminClient, authenticatedUser, json } from './_whoop-utils.mjs'

async function requireAdmin(req) {
  const user = await authenticatedUser(req)
  if (!user) return { error: json({ error: 'Unauthorized' }, 401) }
  const admin = adminClient()
  const { data: adminRow, error } = await admin.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle()
  if (error) throw error
  if (!adminRow) return { error: json({ error: 'Forbidden' }, 403) }
  return { admin }
}

export default async function handler(req) {
  try {
    const auth = await requireAdmin(req)
    if (auth.error) return auth.error
    const admin = auth.admin

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      const userId = body.user_id
      if (!userId || typeof userId !== 'string') return json({ error: 'user_id is required' }, 400)

      let goal = null
      if (body.daily_calorie_goal !== '' && body.daily_calorie_goal != null) {
        goal = Math.round(Number(body.daily_calorie_goal))
        if (!Number.isFinite(goal) || goal <= 0 || goal > 20000) return json({ error: 'Daily calorie goal must be between 1 and 20,000' }, 400)
      }

      const { data: existing, error: getError } = await admin.auth.admin.getUserById(userId)
      if (getError) throw getError
      if (!existing?.user) return json({ error: 'User not found' }, 404)

      const metadata = { ...(existing.user.user_metadata || {}) }
      if (goal == null) delete metadata.daily_calorie_goal
      else metadata.daily_calorie_goal = goal

      const { error: updateError } = await admin.auth.admin.updateUserById(userId, { user_metadata: metadata })
      if (updateError) throw updateError
      return json({ user_id: userId, daily_calorie_goal: goal })
    }

    if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

    const users = []
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) throw error
      users.push(...(data.users || []).map(user => ({
        id: user.id,
        daily_calorie_goal: Number.isFinite(Number(user.user_metadata?.daily_calorie_goal)) ? Number(user.user_metadata.daily_calorie_goal) : null,
      })))
      if ((data.users || []).length < 1000) break
    }
    return json({ users })
  } catch (error) {
    return json({ error: error.message || 'Calorie goal request failed' }, 500)
  }
}
