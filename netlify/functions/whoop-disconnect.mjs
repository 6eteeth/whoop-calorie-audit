import { adminClient, authenticatedUser, json, validAccessToken, whoopFetch } from './_whoop-utils.mjs'

export default async req => {
  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    const user = await authenticatedUser(req)
    if (!user) return json({ error: 'Unauthorized' }, 401)
    const admin = adminClient()
    const { data: connection } = await admin.from('whoop_connections').select('*').eq('user_id', user.id).maybeSingle()
    if (connection) {
      try { const token = await validAccessToken(admin, connection); await whoopFetch('/v2/user/access', token, { method: 'DELETE' }) } catch (error) { console.warn('WHOOP revoke failed', error.message) }
    }
    await admin.from('whoop_connections').delete().eq('user_id', user.id)
    return json({ ok: true })
  } catch (error) { return json({ error: error.message }, 500) }
}
