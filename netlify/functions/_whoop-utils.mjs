import { createClient } from '@supabase/supabase-js'

export const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth'
export const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token'
export const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer'
export const WHOOP_SCOPES = 'offline read:profile read:body_measurement read:cycles read:recovery read:sleep read:workout'

export function env() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'WHOOP_CLIENT_ID', 'WHOOP_CLIENT_SECRET', 'WHOOP_REDIRECT_URI']
  const missing = required.filter(k => !process.env[k])
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`)
  return {
    supabaseUrl: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    clientId: process.env.WHOOP_CLIENT_ID,
    clientSecret: process.env.WHOOP_CLIENT_SECRET,
    redirectUri: process.env.WHOOP_REDIRECT_URI,
  }
}

export function adminClient() {
  const { supabaseUrl, serviceKey } = env()
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function authenticatedUser(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const admin = adminClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
}

export function workoutRow(workout, userId) {
  const duration = (!workout.start || !workout.end) ? null : Math.max(0, Math.round((new Date(workout.end) - new Date(workout.start)) / 60000))
  return {
    id: workout.id,
    user_id: userId,
    whoop_user_id: workout.user_id,
    workout_date: dateWithOffset(workout.start, workout.timezone_offset),
    start_time: workout.start,
    end_time: workout.end,
    timezone_offset: workout.timezone_offset,
    sport_id: workout.sport_id,
    sport_name: workout.sport_name || 'Workout',
    score_state: workout.score_state,
    strain: workout.score?.strain ?? null,
    average_heart_rate: workout.score?.average_heart_rate ?? null,
    max_heart_rate: workout.score?.max_heart_rate ?? null,
    kilojoule: workout.score?.kilojoule ?? null,
    calories: workout.score?.kilojoule == null ? null : Math.round(Number(workout.score.kilojoule) / 4.184),
    duration_minutes: duration,
    raw_data: workout,
    updated_at: new Date().toISOString(),
  }
}

export function redirect(location, status = 302) {
  return new Response(null, { status, headers: { location, 'cache-control': 'no-store' } })
}

export function randomState() {
  return crypto.randomUUID()
}

export async function tokenRequest(params) {
  const response = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error_description || body.error || `WHOOP token request failed (${response.status})`)
  return body
}

export async function validAccessToken(admin, connection) {
  const expiresAt = new Date(connection.expires_at).getTime()
  if (expiresAt > Date.now() + 120000) return connection.access_token
  const { clientId, clientSecret } = env()
  const fresh = await tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: connection.refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'offline',
  })
  const next = {
    access_token: fresh.access_token,
    refresh_token: fresh.refresh_token || connection.refresh_token,
    expires_at: new Date(Date.now() + Number(fresh.expires_in || 3600) * 1000).toISOString(),
    scope: fresh.scope || connection.scope,
    updated_at: new Date().toISOString(),
  }
  const { error } = await admin.from('whoop_connections').update(next).eq('user_id', connection.user_id)
  if (error) throw error
  return next.access_token
}

export async function whoopFetch(path, accessToken, options = {}) {
  const response = await fetch(`${WHOOP_API_BASE}${path}`, { ...options, headers: { ...(options.headers || {}), authorization: `Bearer ${accessToken}` } })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`WHOOP API ${response.status}: ${body.slice(0, 300)}`)
  }
  if (response.status === 204) return null
  return response.json()
}

export async function whoopFetchAll(path, accessToken) {
  const records = []
  let nextToken = null

  do {
    const separator = path.includes('?') ? '&' : '?'
    const pagePath = nextToken == null ? path : `${path}${separator}nextToken=${encodeURIComponent(nextToken)}`
    const page = await whoopFetch(pagePath, accessToken)
    records.push(...(page?.records || []))
    nextToken = page?.next_token || null
  } while (nextToken)

  return records
}

export function dateWithOffset(iso, offset = '+00:00') {
  const instant = new Date(iso)
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(offset || '')
  const minutes = match ? (Number(match[2]) * 60 + Number(match[3])) * (match[1] === '-' ? -1 : 1) : 0
  return new Date(instant.getTime() + minutes * 60000).toISOString().slice(0, 10)
}
