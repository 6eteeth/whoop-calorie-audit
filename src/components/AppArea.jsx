import { lazy, Suspense, useEffect, useState } from 'react'
import '../lib/charts'
import { caloriesFromMacros } from '../lib/analytics'
import { localDateKey, longDate, useLocalDateKey } from '../lib/dates'
import { emptyEntry, hasValue, nutritionComplete, whoopComplete } from '../lib/entries'
import { isConfigured, supabase } from '../lib/supabase'
import AppLearningCenter from './AppLearningCenter'
import AuthScreen from './AuthScreen'
import Dashboard from './Dashboard'
import EntryForm from './EntryForm'
import History from './History'
import { Brand, Link } from './Navigation'
import WhoopPanel from './WhoopPanel'

const AdminDashboard = lazy(() => import('./AdminDashboard'))

function SetupScreen() {
  return <main className="auth-page"><section className="auth-card"><Brand /><h1>Connect ZCore</h1><p>Add your Supabase Project URL and publishable key as Netlify environment variables:</p><code>VITE_SUPABASE_URL</code><br /><code>VITE_SUPABASE_PUBLISHABLE_KEY</code></section></main>
}

export default function AppArea() {
  const currentLocalDate = useLocalDateKey()
  const [session, setSession] = useState(null), [loading, setLoading] = useState(true), [entries, setEntries] = useState([]), [tab, setTab] = useState('dashboard'), [editing, setEditing] = useState(emptyEntry()), [message, setMessage] = useState(''), [whoopConnected, setWhoopConnected] = useState(false), [wearableChoice, setWearableChoice] = useState(null), [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => { if (!isConfigured) { setLoading(false); return } supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) }); const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession)); return () => listener.subscription.unsubscribe() }, [])
  useEffect(() => { if (session) { loadEntries(); loadPreferences(); checkWhoop(); checkAdmin() } }, [session])
  async function checkAdmin() { try { const { data: { session: current } } = await supabase.auth.getSession(); const response = await fetch('/.netlify/functions/admin-overview?check=1', { headers: { authorization: `Bearer ${current?.access_token || ''}` } }); setIsAdmin(response.ok) } catch { setIsAdmin(false) } }
  async function checkWhoop() { try { const { data: { session: current } } = await supabase.auth.getSession(); const response = await fetch('/.netlify/functions/whoop-status', { headers: { authorization: `Bearer ${current?.access_token || ''}` } }); const result = await response.json(); setWhoopConnected(Boolean(result.connected)); if (result.connected) setWearableChoice('whoop') } catch { setWhoopConnected(false) } }
  async function loadPreferences() { const { data } = await supabase.from('user_preferences').select('wearable_provider').maybeSingle(); if (data) setWearableChoice(data.wearable_provider || 'none') }
  async function saveWearableChoice(choice) { setWearableChoice(choice); await supabase.from('user_preferences').upsert({ user_id: session.user.id, wearable_provider: choice }, { onConflict: 'user_id' }); setTab(choice === 'whoop' ? 'integrations' : 'entry') }
  async function loadEntries() {
    const pageSize = 1000
    const rows = []
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase.from('daily_entries').select('*').order('entry_date', { ascending: true }).order('id', { ascending: true }).range(from, from + pageSize - 1)
      if (error) { setMessage(error.message); return }
      rows.push(...(data || []))
      if ((data || []).length < pageSize) { setEntries(rows); return }
    }
  }
  async function saveEntry(form) {
    setMessage('')
    const nullableNumber = value => value === '' || value == null ? null : Number(value)
    const calories = nutritionComplete(form) ? caloriesFromMacros(form.carbs_g, form.protein_g, form.fat_g) : null
    const payload = {
      user_id: session.user.id,
      entry_date: form.entry_date,
      weight_lb: nullableNumber(form.weight_lb),
      carbs_g: nullableNumber(form.carbs_g),
      fat_g: nullableNumber(form.fat_g),
      protein_g: nullableNumber(form.protein_g),
      calories_eaten: calories,
      whoop_calories_burned: nullableNumber(form.whoop_calories_burned),
      steps: nullableNumber(form.steps),
      used_ai_calorie_estimate: Boolean(form.used_ai_calorie_estimate),
      caffeine_after_3pm: Boolean(form.caffeine_after_3pm),
      alcohol_consumed: Boolean(form.alcohol_consumed),
      notes: form.notes || null,
      whoop_synced_at: form.whoop_synced_at || null,
    }
    const whoopFields = ['whoop_day_strain','whoop_average_heart_rate','whoop_max_heart_rate','whoop_recovery_score','whoop_resting_heart_rate','whoop_hrv_rmssd_milli','whoop_spo2_percentage','whoop_skin_temp_celsius','whoop_sleep_duration_minutes','whoop_time_in_bed_minutes','whoop_awake_minutes','whoop_light_sleep_minutes','whoop_slow_wave_sleep_minutes','whoop_rem_sleep_minutes','whoop_sleep_performance_percentage','whoop_sleep_efficiency_percentage','whoop_sleep_consistency_percentage','whoop_respiratory_rate','whoop_disturbance_count','whoop_sleep_cycle_count','whoop_sleep_needed_minutes']
    whoopFields.forEach(field => { payload[field] = nullableNumber(form[field]) })
    for (const n of [1,2,3]) {
      payload[`workout_${n}_type`] = form[`workout_${n}_type`] || 'None'
      payload[`workout_${n}_minutes`] = nullableNumber(form[`workout_${n}_minutes`])
      payload[`workout_${n}_calories`] = nullableNumber(form[`workout_${n}_calories`])
      payload[`workout_${n}_whoop_calories`] = nullableNumber(form[`workout_${n}_whoop_calories`])
    }
    const { data, error } = await supabase.from('daily_entries').upsert(payload, { onConflict: 'user_id,entry_date' }).select().single()
    if (error) setMessage(error.message)
    else {
      await loadEntries()
      setEditing({ ...emptyEntry(), ...data })
      const savedParts = []
      if (hasValue(data.weight_lb)) savedParts.push('weight')
      if (nutritionComplete(data)) savedParts.push('nutrition')
      if (whoopComplete(data)) savedParts.push('WHOOP')
      setMessage(`Progress saved for ${longDate(data.entry_date)}${savedParts.length ? `: ${savedParts.join(', ')}` : ''}. You can return and update this date anytime.`)
    }
  }
  async function deleteEntry(entry) { if (!window.confirm(`Delete the entry for ${longDate(entry.entry_date)}?`)) return; const { error } = await supabase.from('daily_entries').delete().eq('id', entry.id); if (error) setMessage(error.message); else await loadEntries() }
  if (!isConfigured) return <SetupScreen />
  if (loading) return <main className="auth-page"><div className="auth-card"><Brand /><p>Loading…</p></div></main>
  if (!session) return <AuthScreen />
  return <div className="app-bg"><div className="app-shell"><header className="app-header"><Brand /><div className="app-header-actions"><Link href="/" className="text-link">Website</Link><button className="button button-secondary" onClick={() => supabase.auth.signOut()}>Sign out</button></div></header>{wearableChoice == null && <section className="onboarding-card"><span className="eyebrow">Welcome to ZCore</span><h2>Do you use a wearable?</h2><p>ZCore works fully without one. Choose WHOOP only to unlock automatic recovery, sleep, strain, and workout imports.</p><div className="choice-grid"><button className="choice-card" onClick={() => saveWearableChoice('none')}><strong>No wearable</strong><span>Weight, macros, steps, and workouts</span></button><button className="choice-card" onClick={() => saveWearableChoice('whoop')}><strong>WHOOP</strong><span>Connect automatic wearable data</span></button><button className="choice-card" onClick={() => saveWearableChoice('other')}><strong>Other wearable</strong><span>Manual entry for now; more integrations later</span></button></div></section>}<nav className="app-nav">{[...([['dashboard','Dashboard'],['entry','Daily log'],['history','History'],['learning','Learning Center'],['integrations','Integrations']]), ...(isAdmin ? [['admin','Admin']] : [])].map(([id,label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => {
      setTab(id)
      if (id === 'entry') {
        const today = localDateKey()
        const savedToday = entries.find(item => item.entry_date === today)
        setEditing(savedToday ? { ...emptyEntry(), ...savedToday, entry_date: today } : { ...emptyEntry(), entry_date: today })
      }
    }}>{label}</button>)}</nav>{message && <div className="message">{message}</div>}{tab === 'dashboard' && <Dashboard entries={entries} whoopConnected={whoopConnected} today={currentLocalDate} />}{tab === 'entry' && <EntryForm key={editing.id || editing.entry_date} entry={editing} entries={entries} whoopConnected={whoopConnected} onSave={saveEntry} onCancel={editing.id ? () => { setEditing(emptyEntry()); setTab('history') } : null} />}{tab === 'history' && <History entries={entries} onEdit={entry => { setEditing(entry); setTab('entry') }} onDelete={deleteEntry} />}{tab === 'learning' && <AppLearningCenter />}{tab === 'admin' && isAdmin && <Suspense fallback={<section className="admin-panel"><p>Loading admin analytics…</p></section>}><AdminDashboard /></Suspense>}{tab === 'integrations' && <section className="integration-stack"><div className="integration-intro"><span className="eyebrow">Optional data sources</span><h2>Integrations</h2><p>ZCore learns from Calories In, Calories Out, and changes in body weight. Wearables are optional data sources that add automatic activity, sleep, recovery, and calorie information.</p><label>Current setup<select value={wearableChoice || 'none'} onChange={e => saveWearableChoice(e.target.value)}><option value="none">No wearable</option><option value="whoop">WHOOP</option><option value="other">Other wearable (manual for now)</option></select></label></div><div className="provider-grid"><article className={`provider-card ${wearableChoice === 'whoop' ? 'selected' : ''}`}><span className="provider-status live">Available</span><h3>WHOOP</h3><p>Automatic workouts, calories, strain, recovery, heart rate, HRV, and sleep.</p></article><article className="provider-card"><span className="provider-status">Coming soon</span><h3>Garmin</h3><p>Planned support for daily summaries, steps, calories, sleep, heart rate, and activities.</p></article><article className="provider-card"><span className="provider-status">Planned</span><h3>Apple Health</h3><p>A future bridge for activity, workouts, body measurements, and supported health metrics.</p></article><article className="provider-card"><span className="provider-status">Planned</span><h3>Fitbit & Oura</h3><p>Additional wearable options are planned as ZCore's integration layer expands.</p></article></div>{wearableChoice === 'whoop' && <WhoopPanel />}{wearableChoice !== 'whoop' && <div className="integration-card"><h3>No wearable connection required</h3><p>Continue logging weight, macros, steps, and workouts. ZCore will estimate your metabolism from Calories In and observed body-weight trends.</p></div>}</section>}</div></div>
}
