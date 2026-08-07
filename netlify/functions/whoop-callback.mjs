import { adminClient, env, redirect, tokenRequest, whoopFetch } from './_whoop-utils.mjs'

export function appUrl(req) {
  const origin = process.env.DEPLOY_PRIME_URL || process.env.URL || new URL(req.url).origin
  return `${origin.replace(/\/$/, '')}/app`
}

export default async req => {
  const redirectUrl = appUrl(req)
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const denied = url.searchParams.get('error')
    if (denied) return redirect(`${redirectUrl}?whoop=denied`)
    if (!code || !state) return redirect(`${redirectUrl}?whoop=invalid_callback`)
    const admin = adminClient()
    const { data: stateRow, error: stateError } = await admin.from('whoop_oauth_states').select('*').eq('state', state).single()
    if (stateError || !stateRow || new Date(stateRow.expires_at) < new Date()) return redirect(`${redirectUrl}?whoop=invalid_state`)
    await admin.from('whoop_oauth_states').delete().eq('state', state)
    const { clientId, clientSecret, redirectUri } = env()
    const tokens = await tokenRequest({ grant_type: 'authorization_code', code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri })
    const profile = await whoopFetch('/v2/user/profile/basic', tokens.access_token)
    const { error } = await admin.from('whoop_connections').upsert({
      user_id: stateRow.user_id,
      whoop_user_id: profile.user_id,
      whoop_email: profile.email,
      whoop_first_name: profile.first_name,
      whoop_last_name: profile.last_name,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000).toISOString(),
      scope: tokens.scope,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (error) throw error
    return redirect(`${redirectUrl}?whoop=connected`)
  } catch (error) {
    console.error(error)
    return redirect(`${redirectUrl}?whoop=error`)
  }
}
