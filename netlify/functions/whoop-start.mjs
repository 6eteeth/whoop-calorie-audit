import { WHOOP_AUTH_URL, WHOOP_SCOPES, adminClient, authenticatedUser, env, json, randomState } from './_whoop-utils.mjs'

export default async req => {
  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    const user = await authenticatedUser(req)
    if (!user) return json({ error: 'Please sign in again.' }, 401)
    const admin = adminClient()
    const state = randomState()
    await admin.from('whoop_oauth_states').delete().lt('expires_at', new Date().toISOString())
    const { error } = await admin.from('whoop_oauth_states').insert({ state, user_id: user.id, expires_at: new Date(Date.now() + 10 * 60000).toISOString() })
    if (error) throw error
    const { clientId, redirectUri } = env()
    const url = new URL(WHOOP_AUTH_URL)
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', WHOOP_SCOPES)
    url.searchParams.set('state', state)
    return json({ url: url.toString() })
  } catch (error) {
    return json({ error: error.message }, 500)
  }
}
