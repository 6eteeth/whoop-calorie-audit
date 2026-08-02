import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const formatDateTime = value => value ? new Date(value).toLocaleString() : 'Never'
const formatDay = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'

async function callFunction(name, method = 'GET') {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Please sign in again.')
  const response = await fetch(`/.netlify/functions/${name}`, {
    method,
    headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`)
  return body
}

export default function WhoopPanel() {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    try { setData(await callFunction('whoop-status')) }
    catch (error) { setMessage(error.message) }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get('whoop')
    if (result === 'connected') setMessage('WHOOP connected successfully. Press Sync WHOOP to import your data.')
    if (result === 'denied') setMessage('WHOOP authorization was cancelled.')
    if (result && !['connected', 'denied'].includes(result)) setMessage('WHOOP could not be connected. Check the redirect URL and Netlify function logs.')
    if (result) window.history.replaceState({}, '', '/app')
    load()
  }, [])

  async function connect() {
    setBusy(true); setMessage('')
    try { const result = await callFunction('whoop-start', 'POST'); window.location.assign(result.url) }
    catch (error) { setMessage(error.message); setBusy(false) }
  }

  async function sync() {
    setBusy(true); setMessage('')
    try {
      const result = await callFunction('whoop-sync', 'POST')
      setMessage(`Sync complete: ${result.workouts} workouts and ${result.days} WHOOP days imported.`)
      await load()
    } catch (error) { setMessage(error.message) }
    finally { setBusy(false) }
  }

  async function disconnect() {
    if (!window.confirm('Disconnect WHOOP? Previously imported records will remain in ZCore.')) return
    setBusy(true); setMessage('')
    try { await callFunction('whoop-disconnect', 'POST'); setMessage('WHOOP disconnected.'); await load() }
    catch (error) { setMessage(error.message) }
    finally { setBusy(false) }
  }

  if (!data) return <section className="integration-card"><p>Checking WHOOP connection…</p>{message && <div className="message">{message}</div>}</section>
  if (!data.connected) return <section className="integration-card integration-connect"><img src="/zcore-mark.png" alt="" /><div><span className="eyebrow">Integration</span><h2>Connect WHOOP</h2><p>Authorize ZCore to import your workouts, workout calories, cycles, recovery, heart rate, HRV, and body measurements.</p>{message && <div className="message">{message}</div>}<button className="button button-primary" onClick={connect} disabled={busy}>{busy ? 'Opening WHOOP…' : 'Connect WHOOP'}</button></div></section>

  const connection = data.connection
  return <div className="whoop-stack">
    <section className="integration-card"><div className="integration-status"><div><span className="status-dot" /><span>WHOOP connected</span></div><small>Last synced: {formatDateTime(connection.last_synced_at)}</small></div><h2>{connection.whoop_first_name || 'WHOOP'} {connection.whoop_last_name || ''}</h2><p>{connection.whoop_email}</p>{message && <div className="message">{message}</div>}<div className="button-row"><button className="button button-primary" onClick={sync} disabled={busy}>{busy ? 'Syncing…' : 'Sync WHOOP'}</button><button className="button button-secondary" onClick={disconnect} disabled={busy}>Disconnect</button></div></section>

    <section className="whoop-summary-grid">{(data.days || []).slice(0, 1).map(day => <div className="whoop-day" key={day.cycle_id}><span className="eyebrow">Latest WHOOP day · {formatDay(day.metric_date)}</span><div className="metric-grid compact-metrics"><Metric label="Total calories" value={day.total_calories} /><Metric label="Day strain" value={day.strain == null ? '—' : Number(day.strain).toFixed(1)} /><Metric label="Recovery" value={day.recovery_score == null ? '—' : `${day.recovery_score}%`} /><Metric label="Resting HR" value={day.resting_heart_rate == null ? '—' : `${day.resting_heart_rate} bpm`} /><Metric label="HRV" value={day.hrv_rmssd_milli == null ? '—' : `${Number(day.hrv_rmssd_milli).toFixed(1)} ms`} /></div></div>)}</section>

    <section className="table-card"><div className="section-heading"><div><span className="eyebrow">Automatically imported</span><h2>Recent WHOOP workouts</h2></div></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Workout</th><th>Minutes</th><th>WHOOP calories</th><th>Strain</th><th>Avg HR</th></tr></thead><tbody>{(data.workouts || []).map(workout => <tr key={workout.id}><td>{formatDay(workout.workout_date)}</td><td className="capitalize">{workout.sport_name}</td><td>{workout.duration_minutes ?? '—'}</td><td>{workout.calories ?? '—'}</td><td>{workout.strain == null ? '—' : Number(workout.strain).toFixed(1)}</td><td>{workout.average_heart_rate ?? '—'}</td></tr>)}{!data.workouts?.length && <tr><td colSpan="6">No workouts imported yet. Press Sync WHOOP.</td></tr>}</tbody></table></div></section>
  </div>
}

function Metric({ label, value }) { return <div className="metric"><span>{label}</span><strong>{value ?? '—'}</strong></div> }
