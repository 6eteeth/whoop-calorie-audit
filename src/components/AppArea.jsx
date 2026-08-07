import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js'
import { supabase, isConfigured } from '../lib/supabase'
import { calculateMetrics, totalWorkoutCalories } from '../lib/analytics'
import WhoopPanel from './WhoopPanel'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend)

const HEALTH_VIDEOS = [
  'KCK9s5Aa5kg','aJFiGC13xIw','K4Ze-Sp6aUE','Pok0Jg2JAkE','vYQaLV3Fm00','ELxTSv-5Ykg','h_1zlead9ZU','_FJSotplMMQ','QVgeB5iWcBc','2bv9kB7yvjQ','HIX_PRZeRW8'
]
const localDateKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const localTimezoneOffset = (dateKey = localDateKey()) => {
  const localNoon = new Date(`${dateKey}T12:00:00`)
  const total = -localNoon.getTimezoneOffset()
  const sign = total >= 0 ? '+' : '-'
  const absolute = Math.abs(total)
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`
}
const shiftLocalDate = (dateKey, days) => {
  const date = new Date(`${dateKey}T12:00:00`)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}
const useLocalDateKey = () => {
  const [dateKey, setDateKey] = useState(localDateKey())
  useEffect(() => {
    let timer
    const schedule = () => {
      const now = new Date()
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      timer = window.setTimeout(() => { setDateKey(localDateKey()); schedule() }, nextMidnight.getTime() - now.getTime() + 250)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [])
  return dateKey
}
const emptyEntry = () => ({
  entry_date: localDateKey(), weight_lb: '', calories_eaten: '', carbs_g: '', fat_g: '', protein_g: '', whoop_calories_burned: '', steps: '',
  whoop_day_strain: '', whoop_average_heart_rate: '', whoop_max_heart_rate: '', whoop_recovery_score: '', whoop_resting_heart_rate: '', whoop_hrv_rmssd_milli: '', whoop_spo2_percentage: '', whoop_skin_temp_celsius: '',
  whoop_sleep_duration_minutes: '', whoop_time_in_bed_minutes: '', whoop_awake_minutes: '', whoop_light_sleep_minutes: '', whoop_slow_wave_sleep_minutes: '', whoop_rem_sleep_minutes: '', whoop_sleep_performance_percentage: '', whoop_sleep_efficiency_percentage: '', whoop_sleep_consistency_percentage: '', whoop_respiratory_rate: '', whoop_disturbance_count: '', whoop_sleep_cycle_count: '', whoop_sleep_needed_minutes: '', whoop_synced_at: null,
  workout_1_type: 'None', workout_1_minutes: '', workout_1_calories: '', workout_1_whoop_calories: '', workout_2_type: 'None', workout_2_minutes: '', workout_2_calories: '', workout_2_whoop_calories: '', workout_3_type: 'None', workout_3_minutes: '', workout_3_calories: '', workout_3_whoop_calories: '', used_ai_calorie_estimate: false, caffeine_after_3pm: false, alcohol_consumed: false, notes: '',
})
const workoutOptions = ['None', 'Strength', 'Cardio', 'StairMaster', 'Walking', 'Running', 'Cycling', 'Rowing', 'Sports', 'Other']
const formatNumber = (value, digits = 0) => Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: digits }) : '—'
const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const longDate = value => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const hasValue = value => value !== '' && value != null
const nutritionComplete = entry => [entry.carbs_g, entry.fat_g, entry.protein_g].every(hasValue)
const whoopComplete = entry => [entry.whoop_calories_burned, entry.whoop_day_strain, entry.whoop_recovery_score, entry.whoop_resting_heart_rate, entry.whoop_hrv_rmssd_milli, entry.whoop_sleep_duration_minutes].every(hasValue)
const workoutComplete = entry => [1, 2, 3].some(n => hasValue(entry[`workout_${n}_minutes`]) || hasValue(entry[`workout_${n}_calories`]) || hasValue(entry[`workout_${n}_whoop_calories`]))
const entryCompletion = entry => ({ weight: hasValue(entry.weight_lb), nutrition: nutritionComplete(entry), workouts: workoutComplete(entry), whoop: whoopComplete(entry) })
function go(path) { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')) }
function Link({ href, children, className = '' }) { return <a className={className} href={href} onClick={e => { if (href.startsWith('/')) { e.preventDefault(); go(href) } }}>{children}</a> }
function Brand() { return <Link href="/" className="brand"><img src="/zcore-mark.png" alt="ZCore" /><span><strong>ZCore</strong><small>Personal Metabolic Intelligence</small></span></Link> }

function AppLearningCenter() {
  return <section className="learning-shell app-learning-center"><section className="learning-hero"><span className="eyebrow">ZCore Learning Center</span><h1>Learn the principles behind sustainable progress.</h1><p>Explore curated videos about calories, nutrition, training, fat loss, and metabolic health while signed in to ZCore.</p></section><section className="video-grid">{HEALTH_VIDEOS.map((id, index) => <article className="video-card" key={id}><a href={`https://youtu.be/${id}`} target="_blank" rel="noreferrer"><img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt={`Health education video ${index + 1}`} /><div className="video-card-body"><span className="status-label">Curated video {index + 1}</span><h2>Health, nutrition, and metabolism</h2><p>Watch this selected resource and consider how the ideas apply to your own long-term data.</p><strong>Watch on YouTube →</strong></div></a></article>)}</section><p className="resource-note">External videos are provided for education and do not constitute medical advice or endorsement of every statement made by a creator.</p></section>
}

function AuthScreen() {
  const [mode, setMode] = useState('signin'), [firstName, setFirstName] = useState(''), [lastName, setLastName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  async function submit(event) { event.preventDefault(); setBusy(true); setMessage(''); const credentials = { email, password }; const result = mode === 'signin' ? await supabase.auth.signInWithPassword(credentials) : await supabase.auth.signUp({ ...credentials, options: { emailRedirectTo: `${window.location.origin}/app`, data: { first_name: firstName.trim(), last_name: lastName.trim() } } }); setBusy(false); if (result.error) setMessage(result.error.message); else if (mode === 'signup' && !result.data.session) setMessage('Account created. Confirm your email, then sign in.') }
  return <main className="auth-page"><Link href="/" className="back-link">← Back to zcore.health</Link><form className="auth-card" onSubmit={submit}><img className="auth-logo" src="/zcore-mark.png" alt="ZCore" /><span className="eyebrow">Personal metabolic intelligence</span><h1>ZCore</h1><p>Sign in to sync your health data across all devices.</p>{mode === 'signup' && <div className="form-grid name-grid"><label>First name<input value={firstName} onChange={e => setFirstName(e.target.value)} required /></label><label>Last name<input value={lastName} onChange={e => setLastName(e.target.value)} required /></label></div>}<label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength="6" required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} /></label>{message && <div className="message">{message}</div>}<button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button><button type="button" className="text-button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'Create a new account' : 'Use an existing account'}</button><div className="auth-legal">By continuing, you agree to the <Link href="/terms">Terms</Link> and acknowledge the <Link href="/privacy">Privacy Policy</Link>.</div></form></main>
}
function SetupScreen() { return <main className="auth-page"><section className="auth-card"><Brand /><h1>Connect ZCore</h1><p>Add your Supabase Project URL and publishable key as Netlify environment variables:</p><code>VITE_SUPABASE_URL</code><br /><code>VITE_SUPABASE_PUBLISHABLE_KEY</code></section></main> }


function weeklyWeightAverages(entries) {
  const groups = new Map()
  entries.filter(entry => hasValue(entry.weight_lb)).forEach(entry => {
    const date = new Date(`${entry.entry_date}T12:00:00`)
    const sunday = new Date(date)
    sunday.setDate(date.getDate() - date.getDay())
    const key = localDateKey(sunday)
    const group = groups.get(key) || []
    group.push(Number(entry.weight_lb))
    groups.set(key, group)
  })
  return [...groups.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([week, values]) => ({ week, average: values.reduce((sum, value) => sum + value, 0) / values.length, days: values.length })).slice(-16)
}

function Dashboard({ entries, whoopConnected, today }) {
  const metrics = useMemo(() => calculateMetrics(entries, 14), [entries])
  const weightRows = entries.filter(e => hasValue(e.weight_lb)).slice(-30)
  const calorieRows = entries.filter(e => hasValue(e.calories_eaten) || hasValue(e.whoop_calories_burned)).slice(-30)
  const latestWeight = weightRows.at(-1)
  const weeklyWeights = weeklyWeightAverages(entries)
  const yesterdayDate = shiftLocalDate(today, -1)
  const todayEntry = entries.find(e => e.entry_date === today) || emptyEntry()
  const yesterdayEntry = entries.find(e => e.entry_date === yesterdayDate) || { ...emptyEntry(), entry_date: yesterdayDate }
  const tasks = [
    { label: "Record today's weight", done: hasValue(todayEntry.weight_lb) },
    ...(whoopConnected ? [{ label: "Sync yesterday's wearable data", done: whoopComplete(yesterdayEntry) }] : []),
    { label: "Enter yesterday's macros", done: nutritionComplete(yesterdayEntry) },
  ]
  const weightData = { labels: weightRows.map(e => dateLabel(e.entry_date)), datasets: [{ label: 'Weight', data: weightRows.map(e => Number(e.weight_lb)), tension: 0.32, borderColor: '#ff1493', backgroundColor: 'rgba(255,20,147,.12)', pointRadius: 3 }] }
  const calorieData = { labels: calorieRows.map(e => dateLabel(e.entry_date)), datasets: [{ label: 'Calories eaten', data: calorieRows.map(e => hasValue(e.calories_eaten) ? Number(e.calories_eaten) : null), backgroundColor: 'rgba(17,24,39,.78)' }, { label: 'WHOOP total calories', data: calorieRows.map(e => hasValue(e.whoop_calories_burned) ? Number(e.whoop_calories_burned) : null), backgroundColor: 'rgba(255,20,147,.72)' }] }
  const weeklyWeightData = { labels: weeklyWeights.map(item => `Week of ${dateLabel(item.week)}`), datasets: [{ label: 'Average weight', data: weeklyWeights.map(item => Number(item.average.toFixed(2))), tension: 0.28, borderColor: '#111827', backgroundColor: 'rgba(17,24,39,.1)', pointRadius: 4 }] }
  return <>
    <section className="task-card"><div><span className="eyebrow">Daily workflow</span><h2>Today's tasks</h2></div><div className="task-list">{tasks.map(task => <div className={`task-item ${task.done ? 'done' : ''}`} key={task.label}><span>{task.done ? '✓' : '○'}</span><strong>{task.label}</strong></div>)}</div></section>
    <div className="metric-grid"><Metric label="Current weight" value={latestWeight ? `${formatNumber(Number(latestWeight.weight_lb), 1)} lb` : '—'} /><Metric label="14-day average intake" value={metrics ? formatNumber(metrics.avgIntake) : '—'} /><Metric label="Estimated actual TDEE" value={metrics?.ready ? formatNumber(metrics.estimatedActual) : `${Math.max(0, 14 - (metrics?.sampleDays || 0))} days left`} /><Metric label={whoopConnected ? 'Wearable correction factor' : 'Wearable comparison'} value={whoopConnected && metrics?.ready && metrics?.correction ? metrics.correction.toFixed(3) : whoopConnected ? 'Collecting data' : 'Not connected'} /></div>
    <section className="insight-card"><div className="insight-head"><span className="feature-icon">◎</span><div><span className="eyebrow">Current analysis</span><h2>{whoopConnected ? 'Wearable accuracy' : 'Metabolic estimate'}</h2></div></div>{whoopConnected ? (!metrics?.ready ? <p>Log {Math.max(0, 14 - (metrics?.sampleDays || 0))} more complete day{Math.max(0, 14 - (metrics?.sampleDays || 0)) === 1 ? '' : 's'} containing weight and nutrition before ZCore displays a TDEE or wearable-accuracy estimate.</p> : <><p>Over the last 14 days, your connected wearable appears to be <strong>{metrics.error >= 0 ? 'overestimating' : 'underestimating'}</strong> expenditure by approximately <strong>{formatNumber(Math.abs(metrics.error))} calories per day</strong> ({formatNumber(Math.abs(metrics.errorPct), 1)}%).</p><small>This remains preliminary until you have at least 14–28 consistent days. Food logging and water-weight changes can affect the estimate.</small></>) : <><p>ZCore can estimate your changing maintenance needs from consistent weight and nutrition data. A wearable is optional and only adds another comparison point.</p><small>For useful estimates, log morning weight and complete macros consistently for at least 14–28 days.</small></>}</section>
    <section className="chart-card weekly-chart-card"><div className="chart-title-row"><div><span className="eyebrow">Sunday through Saturday</span><h2>Weekly average weight</h2></div><small>Missing days are skipped rather than treated as zero.</small></div><div className="chart-wrap chart-wrap-tall"><Line data={weeklyWeightData} options={{ responsive: true, maintainAspectRatio: false, spanGaps: true }} /></div></section><section className="chart-grid"><div className="chart-card"><h2>Daily weight</h2><div className="chart-wrap"><Line data={weightData} options={{ responsive: true, maintainAspectRatio: false, spanGaps: true }} /></div></div><div className="chart-card"><h2>{whoopConnected ? 'Intake vs. wearable' : 'Daily calorie intake'}</h2><div className="chart-wrap"><Bar data={calorieData} options={{ responsive: true, maintainAspectRatio: false }} /></div></div></section>
  </>
}
function Metric({ label, value }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div> }
function EntryForm({ entry, entries, onSave, onCancel, whoopConnected }) {
  const [form, setForm] = useState(entry)
  const [busy, setBusy] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const syncRequest = useRef(0)
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const macrosComplete = nutritionComplete(form)
  const calculatedCalories = macrosComplete ? Math.round(Number(form.carbs_g) * 4 + Number(form.protein_g) * 4 + Number(form.fat_g) * 9) : null
  const completion = entryCompletion(form)

  async function syncSelectedDay(selectedDate = form.entry_date, baseForm = form, automatic = false) {
    if (!selectedDate || !whoopConnected) return
    const requestId = ++syncRequest.current
    setSyncing(true)
    setSyncMessage(automatic ? `Loading saved and WHOOP data for ${longDate(selectedDate)}…` : '')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Please sign in again.')
      const response = await fetch('/.netlify/functions/whoop-sync-day', {
        method: 'POST',
        headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, timezone_offset: localTimezoneOffset(selectedDate) }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || `WHOOP sync failed (${response.status})`)
      if (requestId !== syncRequest.current) return
      const day = result.day || {}
      const next = {
        ...baseForm,
        entry_date: selectedDate,
        whoop_calories_burned: day.total_calories ?? baseForm.whoop_calories_burned ?? '',
        whoop_day_strain: day.strain ?? baseForm.whoop_day_strain ?? '',
        whoop_average_heart_rate: day.average_heart_rate ?? baseForm.whoop_average_heart_rate ?? '',
        whoop_max_heart_rate: day.max_heart_rate ?? baseForm.whoop_max_heart_rate ?? '',
        whoop_recovery_score: day.recovery_score ?? baseForm.whoop_recovery_score ?? '',
        whoop_resting_heart_rate: day.resting_heart_rate ?? baseForm.whoop_resting_heart_rate ?? '',
        whoop_hrv_rmssd_milli: day.hrv_rmssd_milli ?? baseForm.whoop_hrv_rmssd_milli ?? '',
        whoop_spo2_percentage: day.spo2_percentage ?? baseForm.whoop_spo2_percentage ?? '',
        whoop_skin_temp_celsius: day.skin_temp_celsius ?? baseForm.whoop_skin_temp_celsius ?? '',
        whoop_sleep_duration_minutes: day.sleep_duration_minutes ?? baseForm.whoop_sleep_duration_minutes ?? '',
        whoop_time_in_bed_minutes: day.time_in_bed_minutes ?? baseForm.whoop_time_in_bed_minutes ?? '',
        whoop_awake_minutes: day.awake_minutes ?? baseForm.whoop_awake_minutes ?? '',
        whoop_light_sleep_minutes: day.light_sleep_minutes ?? baseForm.whoop_light_sleep_minutes ?? '',
        whoop_slow_wave_sleep_minutes: day.slow_wave_sleep_minutes ?? baseForm.whoop_slow_wave_sleep_minutes ?? '',
        whoop_rem_sleep_minutes: day.rem_sleep_minutes ?? baseForm.whoop_rem_sleep_minutes ?? '',
        whoop_sleep_performance_percentage: day.sleep_performance_percentage ?? baseForm.whoop_sleep_performance_percentage ?? '',
        whoop_sleep_efficiency_percentage: day.sleep_efficiency_percentage ?? baseForm.whoop_sleep_efficiency_percentage ?? '',
        whoop_sleep_consistency_percentage: day.sleep_consistency_percentage ?? baseForm.whoop_sleep_consistency_percentage ?? '',
        whoop_respiratory_rate: day.respiratory_rate ?? baseForm.whoop_respiratory_rate ?? '',
        whoop_disturbance_count: day.disturbance_count ?? baseForm.whoop_disturbance_count ?? '',
        whoop_sleep_cycle_count: day.sleep_cycle_count ?? baseForm.whoop_sleep_cycle_count ?? '',
        whoop_sleep_needed_minutes: day.sleep_needed_minutes ?? baseForm.whoop_sleep_needed_minutes ?? '',
        whoop_synced_at: day.cycle_id ? new Date().toISOString() : baseForm.whoop_synced_at,
      }
      for (const n of [1, 2, 3]) {
        const workout = (result.workouts || [])[n - 1]
        next[`workout_${n}_type`] = workout?.sport_name || 'None'
        next[`workout_${n}_minutes`] = workout?.duration_minutes ?? ''
        next[`workout_${n}_whoop_calories`] = workout?.calories ?? ''
        next[`workout_${n}_calories`] = workout?.calories ?? baseForm[`workout_${n}_calories`] ?? ''
      }
      setForm(next)
      const loaded = []
      if (day.cycle_id) loaded.push('daily calories, strain, heart-rate, recovery, and sleep')
      if ((result.workouts || []).length) loaded.push(`${result.workouts.length} workout${result.workouts.length === 1 ? '' : 's'}`)
      const success = loaded.length ? `Loaded ${loaded.join(' plus ')} for ${longDate(selectedDate)}.` : `No finalized WHOOP values were available for ${longDate(selectedDate)}.`
      setSyncMessage(result.warning || `${success} Steps remain manual because WHOOP does not expose steps through its developer API.`)
    } catch (error) {
      if (requestId === syncRequest.current) setSyncMessage(error.message)
    } finally {
      if (requestId === syncRequest.current) setSyncing(false)
    }
  }

  async function selectDate(selectedDate) {
    const saved = entries.find(item => item.entry_date === selectedDate)
    const base = saved ? { ...emptyEntry(), ...saved, entry_date: selectedDate } : { ...emptyEntry(), entry_date: selectedDate }
    setForm(base)
    if (whoopConnected) await syncSelectedDay(selectedDate, base, true)
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    await onSave({ ...form, calories_eaten: calculatedCalories })
    setBusy(false)
  }
  const sleepHours = form.whoop_sleep_duration_minutes === '' ? '—' : `${(Number(form.whoop_sleep_duration_minutes) / 60).toFixed(1)} hr`

  return <form className="entry-card" onSubmit={submit}>
    <div className="section-heading"><div><span className="eyebrow">Daily log</span><h2>{form.id ? `Edit ${longDate(form.entry_date)}` : 'Add daily entry'}</h2><small>Save any amount of progress now, then return later to add nutrition, workouts, or optional wearable data.</small></div>{whoopConnected && <button type="button" className="button button-pink" onClick={() => syncSelectedDay()} disabled={syncing || !form.entry_date}>{syncing ? 'Loading wearable…' : 'Refresh wearable data'}</button>}</div>
    {syncMessage && <div className="message">{syncMessage}</div>}
    <div className="completion-strip">{[['Weight', completion.weight], ['Nutrition', completion.nutrition], ['Workouts', completion.workouts], ...(whoopConnected ? [['Wearable', completion.whoop]] : [])].map(([label, done]) => <span className={done ? 'complete' : ''} key={label}>{done ? '✓' : '○'} {label}</span>)}</div>
    <div className="form-grid">
      <label>Date<input type="date" value={form.entry_date} onChange={e => selectDate(e.target.value)} required /></label>
      <label>Morning weight (lb)<input type="number" step="0.1" min="1" value={form.weight_lb} onChange={e => update('weight_lb', e.target.value)} /></label>
      <div className="macro-panel full"><div><span className="eyebrow">Nutrition</span><h3>Enter macros; ZCore calculates calories</h3></div><div className="macro-total"><span>Calculated calories</span><strong>{calculatedCalories == null ? '—' : calculatedCalories.toLocaleString()}</strong><small>Carbs × 4 + protein × 4 + fat × 9</small></div></div>
      <label>Carbohydrates (g)<input type="number" min="0" step="0.1" value={form.carbs_g ?? ''} onChange={e => update('carbs_g', e.target.value)} /></label>
      <label>Fat (g)<input type="number" min="0" step="0.1" value={form.fat_g ?? ''} onChange={e => update('fat_g', e.target.value)} /></label>
      <label>Protein (g)<input type="number" min="0" step="0.1" value={form.protein_g ?? ''} onChange={e => update('protein_g', e.target.value)} /></label>
      {whoopConnected && <label>Wearable total calories burned<input type="number" min="0" value={form.whoop_calories_burned} onChange={e => update('whoop_calories_burned', e.target.value)} /><small className="field-note">Automatically filled from your connected WHOOP account.</small></label>}
      <label>Steps<input type="number" min="0" value={form.steps ?? ''} onChange={e => update('steps', e.target.value)} /><small className="field-note">Enter manually when your wearable does not provide steps to ZCore.</small></label>
      {[1,2,3].map(n => <div className="workout-group full" key={n}><h3>Workout {n}</h3><div className="workout-grid"><label>Type<input list="workout-types" value={form[`workout_${n}_type`] || 'None'} onChange={e => update(`workout_${n}_type`, e.target.value)} /></label><label>Minutes<input type="number" min="0" value={form[`workout_${n}_minutes`] ?? ''} onChange={e => update(`workout_${n}_minutes`, e.target.value)} /></label><label>{whoopConnected ? 'Workout calories' : 'Estimated calories (optional)'}<input type="number" min="0" value={form[`workout_${n}_calories`] ?? ''} onChange={e => update(`workout_${n}_calories`, e.target.value)} />{whoopConnected && hasValue(form[`workout_${n}_whoop_calories`]) && <small className="field-note">Imported from WHOOP</small>}</label></div></div>)}
      <datalist id="workout-types">{workoutOptions.map(option => <option key={option} value={option} />)}</datalist>
      {whoopConnected && <>
      <div className="whoop-import-card full"><div className="section-heading"><div><span className="eyebrow">WHOOP selected-day data</span><h3>Recovery, strain, heart rate, and sleep</h3></div>{form.whoop_synced_at && <small>Synced {new Date(form.whoop_synced_at).toLocaleString()}</small>}</div><div className="metric-grid imported-metrics"><Metric label="Day strain" value={form.whoop_day_strain === '' ? '—' : Number(form.whoop_day_strain).toFixed(1)} /><Metric label="Recovery" value={form.whoop_recovery_score === '' ? '—' : `${form.whoop_recovery_score}%`} /><Metric label="Resting HR" value={form.whoop_resting_heart_rate === '' ? '—' : `${form.whoop_resting_heart_rate} bpm`} /><Metric label="HRV" value={form.whoop_hrv_rmssd_milli === '' ? '—' : `${Number(form.whoop_hrv_rmssd_milli).toFixed(1)} ms`} /><Metric label="Sleep" value={sleepHours} /><Metric label="Sleep performance" value={form.whoop_sleep_performance_percentage === '' ? '—' : `${form.whoop_sleep_performance_percentage}%`} /><Metric label="Sleep efficiency" value={form.whoop_sleep_efficiency_percentage === '' ? '—' : `${Number(form.whoop_sleep_efficiency_percentage).toFixed(1)}%`} /><Metric label="Respiratory rate" value={form.whoop_respiratory_rate === '' ? '—' : Number(form.whoop_respiratory_rate).toFixed(1)} /></div><details><summary>View all imported WHOOP values</summary><div className="data-detail-grid"><span>Average HR <strong>{form.whoop_average_heart_rate || '—'}</strong></span><span>Max HR <strong>{form.whoop_max_heart_rate || '—'}</strong></span><span>SpO₂ <strong>{form.whoop_spo2_percentage === '' ? '—' : `${Number(form.whoop_spo2_percentage).toFixed(1)}%`}</strong></span><span>Skin temperature <strong>{form.whoop_skin_temp_celsius === '' ? '—' : `${Number(form.whoop_skin_temp_celsius).toFixed(1)} °C`}</strong></span><span>Time in bed <strong>{form.whoop_time_in_bed_minutes || '—'} min</strong></span><span>Awake <strong>{form.whoop_awake_minutes || '—'} min</strong></span><span>Light sleep <strong>{form.whoop_light_sleep_minutes || '—'} min</strong></span><span>Slow-wave sleep <strong>{form.whoop_slow_wave_sleep_minutes || '—'} min</strong></span><span>REM sleep <strong>{form.whoop_rem_sleep_minutes || '—'} min</strong></span><span>Sleep consistency <strong>{form.whoop_sleep_consistency_percentage === '' ? '—' : `${form.whoop_sleep_consistency_percentage}%`}</strong></span><span>Sleep needed <strong>{form.whoop_sleep_needed_minutes || '—'} min</strong></span><span>Disturbances <strong>{form.whoop_disturbance_count || '—'}</strong></span></div></details></div>
      </>}
      <div className="context-card full"><div><span className="eyebrow">Daily context</span><h3>Factors that may affect interpretation</h3><small>These flags help ZCore separate measurement uncertainty and lifestyle effects from longer-term trends.</small></div><div className="checkbox-grid"><label className="check-option"><input type="checkbox" checked={Boolean(form.used_ai_calorie_estimate)} onChange={e => update('used_ai_calorie_estimate', e.target.checked)} /><span><strong>AI-assisted calorie estimate</strong><small>Some or all food calories were estimated from a photo or AI tool.</small></span></label><label className="check-option"><input type="checkbox" checked={Boolean(form.caffeine_after_3pm)} onChange={e => update('caffeine_after_3pm', e.target.checked)} /><span><strong>Caffeine after 3 PM</strong><small>Useful when evaluating sleep and recovery patterns.</small></span></label><label className="check-option"><input type="checkbox" checked={Boolean(form.alcohol_consumed)} onChange={e => update('alcohol_consumed', e.target.checked)} /><span><strong>Alcohol consumed</strong><small>Useful when evaluating sleep, recovery, appetite, and weight variability.</small></span></label></div></div>
      <label className="full">Notes<textarea rows="3" value={form.notes ?? ''} onChange={e => update('notes', e.target.value)} /></label>
    </div>
    <div className="button-row"><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save progress'}</button>{onCancel && <button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button>}</div>
  </form>
}
function History({ entries, onEdit, onDelete }) { return <section className="table-card"><div className="section-heading"><div><span className="eyebrow">Your records</span><h2>History</h2></div></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Status</th><th>Weight</th><th>Calories</th><th>Carbs</th><th>Fat</th><th>Protein</th><th>Wearable total</th><th>Workout calories</th><th>Recovery</th><th>Sleep</th><th></th></tr></thead><tbody>{[...entries].reverse().map(entry => { const status = entryCompletion(entry); const hasWearableData = [entry.whoop_calories_burned, entry.whoop_day_strain, entry.whoop_recovery_score, entry.whoop_resting_heart_rate, entry.whoop_hrv_rmssd_milli, entry.whoop_sleep_duration_minutes].some(hasValue); const completed = [status.weight, status.nutrition, status.workouts, ...(hasWearableData ? [status.whoop] : [])].filter(Boolean).length; const total = hasWearableData ? 4 : 3; return <tr key={entry.id}><td><button className="link-button" onClick={() => onEdit(entry)}>{longDate(entry.entry_date)}</button></td><td><span className="completion-badge">{completed}/{total}</span></td><td>{hasValue(entry.weight_lb) ? `${entry.weight_lb} lb` : '—'}</td><td>{hasValue(entry.calories_eaten) ? entry.calories_eaten : '—'}</td><td>{entry.carbs_g ?? '—'}</td><td>{entry.fat_g ?? '—'}</td><td>{entry.protein_g ?? '—'}</td><td>{hasValue(entry.whoop_calories_burned) ? entry.whoop_calories_burned : '—'}</td><td>{workoutComplete(entry) ? totalWorkoutCalories(entry) : '—'}</td><td>{entry.whoop_recovery_score == null ? '—' : `${entry.whoop_recovery_score}%`}</td><td>{entry.whoop_sleep_duration_minutes == null ? '—' : `${(Number(entry.whoop_sleep_duration_minutes)/60).toFixed(1)} hr`}</td><td><button className="danger" onClick={() => onDelete(entry)}>Delete</button></td></tr>})}</tbody></table></div></section> }



function AdminDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch('/.netlify/functions/admin-overview', { headers: { authorization: `Bearer ${session?.access_token || ''}` } })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error || `Admin request failed (${response.status})`)
        if (active) setData(result)
      } catch (e) { if (active) setError(e.message) }
      finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [])

  if (loading) return <section className="admin-panel"><p>Loading admin analytics…</p></section>
  if (error) return <section className="admin-panel"><div className="message">{error}</div></section>
  const users = (data?.users || []).filter(user => {
    const haystack = `${user.first_name || ''} ${user.last_name || ''} ${user.email || ''}`.toLowerCase()
    const matchesQuery = haystack.includes(query.toLowerCase())
    const matchesFilter = filter === 'all' || (filter === 'wearable' && user.wearable_connected) || (filter === 'active7' && user.active_last_7_days) || (filter === 'inactive30' && !user.active_last_30_days)
    return matchesQuery && matchesFilter
  })
  const trendData = { labels: (data?.trends?.monthly_signups || []).map(x => x.month), datasets: [{ label: 'New users', data: (data?.trends?.monthly_signups || []).map(x => x.count), borderColor: '#ff1493', backgroundColor: 'rgba(255,20,147,.12)', tension: .3 }] }
  const activityData = { labels: (data?.trends?.daily_active_users || []).map(x => x.date), datasets: [{ label: 'Daily active users', data: (data?.trends?.daily_active_users || []).map(x => x.count), backgroundColor: 'rgba(17,24,39,.82)' }] }
  return <section className="admin-panel">
    <div className="admin-heading"><div><span className="eyebrow">Private administration</span><h2>Admin analytics</h2><p>Account and aggregate usage information only. Individual health details are not displayed.</p></div><span className="admin-badge">Admin only</span></div>
    <div className="admin-metrics">
      <Metric label="Total users" value={formatNumber(data.summary.total_users)} />
      <Metric label="Active today" value={formatNumber(data.summary.daily_active_users)} />
      <Metric label="Active this week" value={formatNumber(data.summary.weekly_active_users)} />
      <Metric label="Active this month" value={formatNumber(data.summary.monthly_active_users)} />
      <Metric label="New this month" value={formatNumber(data.summary.new_users_this_month)} />
      <Metric label="Wearables connected" value={formatNumber(data.summary.wearables_connected)} />
      <Metric label="Average logging streak" value={`${formatNumber(data.summary.average_logging_streak, 1)} days`} />
      <Metric label="Average logged days" value={formatNumber(data.summary.average_logged_days, 1)} />
      <Metric label="14-day TDEE ready" value={formatNumber(data.summary.users_with_tdee_ready)} />
      <Metric label="Average calculated TDEE" value={data.summary.average_calculated_tdee ? `${formatNumber(data.summary.average_calculated_tdee)} kcal` : '—'} />
      <Metric label="Average weight change" value={data.summary.average_weight_change_lb == null ? '—' : `${formatNumber(data.summary.average_weight_change_lb, 1)} lb`} />
      <Metric label="Total daily logs" value={formatNumber(data.summary.total_daily_logs)} />
    </div>
    <div className="admin-chart-grid"><div className="chart-card"><h3>New users by month</h3><div className="chart-wrap"><Line data={trendData} options={{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } } } }} /></div></div><div className="chart-card"><h3>Daily active users</h3><div className="chart-wrap"><Bar data={activityData} options={{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } } } }} /></div></div></div>
    <div className="admin-breakdowns"><article><h3>Wearable adoption</h3>{(data.breakdowns.wearables || []).map(item => <div className="breakdown-row" key={item.provider}><span>{item.provider}</span><strong>{item.count}</strong></div>)}</article><article><h3>Popular workout types</h3>{(data.breakdowns.workout_types || []).map(item => <div className="breakdown-row" key={item.type}><span>{item.type}</span><strong>{item.count}</strong></div>)}</article><article><h3>Data quality context</h3><div className="breakdown-row"><span>AI-estimated days</span><strong>{data.breakdowns.ai_estimated_days}</strong></div><div className="breakdown-row"><span>Alcohol days</span><strong>{data.breakdowns.alcohol_days}</strong></div><div className="breakdown-row"><span>Late-caffeine days</span><strong>{data.breakdowns.late_caffeine_days}</strong></div></article></div>
    <section className="table-card admin-users"><div className="section-heading"><div><span className="eyebrow">User directory</span><h2>Users</h2></div><div className="admin-controls"><input placeholder="Search name or email" value={query} onChange={e => setQuery(e.target.value)} /><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All users</option><option value="wearable">Wearable connected</option><option value="active7">Active this week</option><option value="inactive30">Inactive 30+ days</option></select></div></div><div className="table-wrap"><table><thead><tr><th>First name</th><th>Last name</th><th>Email</th><th>Joined</th><th>Last login</th><th>Wearable</th><th>Last sync</th><th>Logs</th><th>Streak</th></tr></thead><tbody>{users.map(user => <tr key={user.id}><td>{user.first_name || 'Not provided'}</td><td>{user.last_name || 'Not provided'}</td><td>{user.email}</td><td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td><td>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}</td><td>{user.wearable_connected ? user.wearable_provider : 'None'}</td><td>{user.last_wearable_sync ? new Date(user.last_wearable_sync).toLocaleString() : '—'}</td><td>{user.daily_entries}</td><td>{user.logging_streak}</td></tr>)}</tbody></table></div></section>
  </section>
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
    const calories = nutritionComplete(form) ? Math.round(Number(form.carbs_g) * 4 + Number(form.protein_g) * 4 + Number(form.fat_g) * 9) : null
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
    }}>{label}</button>)}</nav>{message && <div className="message">{message}</div>}{tab === 'dashboard' && <Dashboard entries={entries} whoopConnected={whoopConnected} today={currentLocalDate} />}{tab === 'entry' && <EntryForm key={editing.id || editing.entry_date} entry={editing} entries={entries} whoopConnected={whoopConnected} onSave={saveEntry} onCancel={editing.id ? () => { setEditing(emptyEntry()); setTab('history') } : null} />}{tab === 'history' && <History entries={entries} onEdit={entry => { setEditing(entry); setTab('entry') }} onDelete={deleteEntry} />}{tab === 'learning' && <AppLearningCenter />}{tab === 'admin' && isAdmin && <AdminDashboard />}{tab === 'integrations' && <section className="integration-stack"><div className="integration-intro"><span className="eyebrow">Optional data sources</span><h2>Integrations</h2><p>ZCore learns from Calories In, Calories Out, and changes in body weight. Wearables are optional data sources that add automatic activity, sleep, recovery, and calorie information.</p><label>Current setup<select value={wearableChoice || 'none'} onChange={e => saveWearableChoice(e.target.value)}><option value="none">No wearable</option><option value="whoop">WHOOP</option><option value="other">Other wearable (manual for now)</option></select></label></div><div className="provider-grid"><article className={`provider-card ${wearableChoice === 'whoop' ? 'selected' : ''}`}><span className="provider-status live">Available</span><h3>WHOOP</h3><p>Automatic workouts, calories, strain, recovery, heart rate, HRV, and sleep.</p></article><article className="provider-card"><span className="provider-status">Coming soon</span><h3>Garmin</h3><p>Planned support for daily summaries, steps, calories, sleep, heart rate, and activities.</p></article><article className="provider-card"><span className="provider-status">Planned</span><h3>Apple Health</h3><p>A future bridge for activity, workouts, body measurements, and supported health metrics.</p></article><article className="provider-card"><span className="provider-status">Planned</span><h3>Fitbit & Oura</h3><p>Additional wearable options are planned as ZCore's integration layer expands.</p></article></div>{wearableChoice === 'whoop' && <WhoopPanel />}{wearableChoice !== 'whoop' && <div className="integration-card"><h3>No wearable connection required</h3><p>Continue logging weight, macros, steps, and workouts. ZCore will estimate your metabolism from Calories In and observed body-weight trends.</p></div>}</section>}</div></div>
}
