import { useEffect, useMemo, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { supabase, isConfigured } from './lib/supabase'
import { calculateMetrics, totalWorkoutCalories } from './lib/analytics'

const today = new Date().toISOString().slice(0, 10)
const emptyEntry = () => ({
  entry_date: today,
  weight_lb: '',
  calories_eaten: '',
  whoop_calories_burned: '',
  protein_g: '',
  steps: '',
  workout_1_type: 'None',
  workout_1_minutes: '',
  workout_1_whoop_calories: '',
  workout_2_type: 'None',
  workout_2_minutes: '',
  workout_2_whoop_calories: '',
  workout_3_type: 'None',
  workout_3_minutes: '',
  workout_3_whoop_calories: '',
  notes: '',
})

const workoutOptions = ['None', 'Strength', 'Cardio', 'StairMaster', 'Walking', 'Running', 'Cycling', 'Rowing', 'Sports', 'Other']
const formatNumber = (value, digits = 0) => Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: digits }) : '—'
const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const longDate = value => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

function AuthScreen() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const credentials = { email, password }
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp(credentials)
    setBusy(false)
    if (result.error) setMessage(result.error.message)
    else if (mode === 'signup' && !result.data.session) setMessage('Account created. Confirm your email, then sign in.')
  }

  return <main className="auth-page">
    <form className="auth-card" onSubmit={submit}>
      <span className="eyebrow">Personal metabolic intelligence</span>
      <h1>ZCore</h1>
      <p>Sign in to sync your health data across all devices.</p>
      <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength="6" required /></label>
      {message && <div className="message">{message}</div>}
      <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
      <button type="button" className="text-button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        {mode === 'signin' ? 'Create a new account' : 'Use an existing account'}
      </button>
    </form>
  </main>
}

function SetupScreen() {
  return <main className="auth-page"><section className="auth-card">
    <span className="eyebrow">One-time setup</span><h1>Connect ZCore</h1>
    <p>Add your Supabase Project URL and publishable key as Netlify environment variables:</p>
    <code>VITE_SUPABASE_URL</code><br /><code>VITE_SUPABASE_PUBLISHABLE_KEY</code>
  </section></main>
}

function Dashboard({ entries }) {
  const metrics = useMemo(() => calculateMetrics(entries, 28), [entries])
  const recent = entries.slice(-30)
  const latest = entries.at(-1)
  const weightData = {
    labels: recent.map(e => dateLabel(e.entry_date)),
    datasets: [{ label: 'Weight', data: recent.map(e => Number(e.weight_lb)), tension: 0.3 }],
  }
  const calorieData = {
    labels: recent.map(e => dateLabel(e.entry_date)),
    datasets: [
      { label: 'Calories eaten', data: recent.map(e => Number(e.calories_eaten)) },
      { label: 'WHOOP total calories', data: recent.map(e => Number(e.whoop_calories_burned)) },
    ],
  }

  return <>
    <div className="metric-grid">
      <Metric label="Current weight" value={latest ? `${formatNumber(Number(latest.weight_lb), 1)} lb` : '—'} />
      <Metric label="28-day average intake" value={metrics ? formatNumber(metrics.avgIntake) : '—'} />
      <Metric label="Estimated actual TDEE" value={metrics?.estimatedActual ? formatNumber(metrics.estimatedActual) : '—'} />
      <Metric label="WHOOP correction factor" value={metrics?.correction ? metrics.correction.toFixed(3) : '—'} />
    </div>
    <section className="insight-card">
      <h2>WHOOP accuracy</h2>
      {!metrics || metrics.sampleDays < 2 ? <p>Add at least two days of data to begin estimating accuracy.</p> : <>
        <p>Over the last 28 days, WHOOP appears to be <strong>{metrics.error >= 0 ? 'overestimating' : 'underestimating'}</strong> expenditure by approximately <strong>{formatNumber(Math.abs(metrics.error))} calories per day</strong> ({formatNumber(Math.abs(metrics.errorPct), 1)}%).</p>
        <small>This is preliminary until you have at least 28–56 consistent days. Food logging and water-weight changes can affect the estimate.</small>
      </>}
    </section>
    <section className="chart-grid">
      <div className="chart-card"><h2>Weight trend</h2><div className="chart-wrap"><Line data={weightData} options={{ responsive: true, maintainAspectRatio: false }} /></div></div>
      <div className="chart-card"><h2>Intake vs. WHOOP</h2><div className="chart-wrap"><Bar data={calorieData} options={{ responsive: true, maintainAspectRatio: false }} /></div></div>
    </section>
  </>
}

function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>
}

function EntryForm({ entry, onSave, onCancel }) {
  const [form, setForm] = useState(entry)
  const [busy, setBusy] = useState(false)
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    await onSave(form)
    setBusy(false)
  }

  return <form className="entry-card" onSubmit={submit}>
    <div className="section-heading"><div><span className="eyebrow">Daily log</span><h2>{entry.id ? `Edit ${longDate(entry.entry_date)}` : 'Add daily entry'}</h2></div></div>
    <div className="form-grid">
      <label>Date<input type="date" value={form.entry_date} onChange={e => update('entry_date', e.target.value)} required /></label>
      <label>Morning weight (lb)<input type="number" step="0.1" min="1" value={form.weight_lb} onChange={e => update('weight_lb', e.target.value)} required /></label>
      <label>Calories eaten<input type="number" min="0" value={form.calories_eaten} onChange={e => update('calories_eaten', e.target.value)} required /></label>
      <label>WHOOP total calories burned<input type="number" min="0" value={form.whoop_calories_burned} onChange={e => update('whoop_calories_burned', e.target.value)} required /></label>
      <label>Protein (g)<input type="number" min="0" value={form.protein_g ?? ''} onChange={e => update('protein_g', e.target.value)} /></label>
      <label>Steps<input type="number" min="0" value={form.steps ?? ''} onChange={e => update('steps', e.target.value)} /></label>
      {[1, 2, 3].map(n => <div className="workout-group full" key={n}>
        <h3>Workout {n}</h3>
        <div className="workout-grid">
          <label>Type<select value={form[`workout_${n}_type`] || 'None'} onChange={e => update(`workout_${n}_type`, e.target.value)}>{workoutOptions.map(option => <option key={option}>{option}</option>)}</select></label>
          <label>Minutes<input type="number" min="0" value={form[`workout_${n}_minutes`] ?? ''} onChange={e => update(`workout_${n}_minutes`, e.target.value)} /></label>
          <label>WHOOP workout calories<input type="number" min="0" value={form[`workout_${n}_whoop_calories`] ?? ''} onChange={e => update(`workout_${n}_whoop_calories`, e.target.value)} /></label>
        </div>
      </div>)}
      <label className="full">Notes<textarea rows="3" value={form.notes ?? ''} onChange={e => update('notes', e.target.value)} /></label>
    </div>
    <div className="button-row"><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save entry'}</button>{onCancel && <button type="button" className="secondary" onClick={onCancel}>Cancel</button>}</div>
  </form>
}

function History({ entries, onEdit, onDelete }) {
  return <section className="table-card"><h2>History</h2><div className="table-wrap"><table>
    <thead><tr><th>Date</th><th>Weight</th><th>Calories in</th><th>WHOOP total</th><th>Workout calories</th><th>Protein</th><th>Steps</th><th></th></tr></thead>
    <tbody>{[...entries].reverse().map(entry => <tr key={entry.id}>
      <td><button className="link-button" onClick={() => onEdit(entry)}>{longDate(entry.entry_date)}</button></td>
      <td>{entry.weight_lb} lb</td><td>{entry.calories_eaten}</td><td>{entry.whoop_calories_burned}</td><td>{totalWorkoutCalories(entry)}</td><td>{entry.protein_g || '—'}</td><td>{entry.steps || '—'}</td>
      <td><button className="danger" onClick={() => onDelete(entry)}>Delete</button></td>
    </tr>)}</tbody>
  </table></div></section>
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])
  const [tab, setTab] = useState('dashboard')
  const [editing, setEditing] = useState(emptyEntry())
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => { if (session) loadEntries() }, [session])

  async function loadEntries() {
    const { data, error } = await supabase.from('daily_entries').select('*').order('entry_date', { ascending: true })
    if (error) setMessage(error.message)
    else setEntries(data || [])
  }

  async function saveEntry(form) {
    setMessage('')
    const payload = {
      user_id: session.user.id,
      entry_date: form.entry_date,
      weight_lb: Number(form.weight_lb),
      calories_eaten: Number(form.calories_eaten),
      whoop_calories_burned: Number(form.whoop_calories_burned),
      protein_g: form.protein_g === '' ? null : Number(form.protein_g),
      steps: form.steps === '' ? null : Number(form.steps),
      notes: form.notes || null,
    }
    for (const n of [1, 2, 3]) {
      payload[`workout_${n}_type`] = form[`workout_${n}_type`] || 'None'
      payload[`workout_${n}_minutes`] = form[`workout_${n}_minutes`] === '' ? null : Number(form[`workout_${n}_minutes`])
      payload[`workout_${n}_whoop_calories`] = form[`workout_${n}_whoop_calories`] === '' ? null : Number(form[`workout_${n}_whoop_calories`])
    }
    const { error } = await supabase.from('daily_entries').upsert(payload, { onConflict: 'user_id,entry_date' })
    if (error) setMessage(error.message)
    else { await loadEntries(); setEditing(emptyEntry()); setTab('dashboard'); setMessage('Entry saved.') }
  }

  async function deleteEntry(entry) {
    if (!window.confirm(`Delete the entry for ${longDate(entry.entry_date)}?`)) return
    const { error } = await supabase.from('daily_entries').delete().eq('id', entry.id)
    if (error) setMessage(error.message)
    else await loadEntries()
  }

  if (!isConfigured) return <SetupScreen />
  if (loading) return <main className="auth-page"><div className="auth-card"><h1>ZCore</h1><p>Loading…</p></div></main>
  if (!session) return <AuthScreen />

  return <div className="app-shell">
    <header><div><span className="eyebrow">Personal metabolic intelligence</span><h1>ZCore</h1></div><button className="icon-button" onClick={() => supabase.auth.signOut()}>Sign out</button></header>
    <nav>{[['dashboard', 'Dashboard'], ['entry', 'Daily entry'], ['history', 'History']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => { setTab(id); if (id === 'entry') setEditing(emptyEntry()) }}>{label}</button>)}</nav>
    {message && <div className="message">{message}</div>}
    {tab === 'dashboard' && <Dashboard entries={entries} />}
    {tab === 'entry' && <EntryForm key={editing.id || editing.entry_date} entry={editing} onSave={saveEntry} onCancel={editing.id ? () => { setEditing(emptyEntry()); setTab('history') } : null} />}
    {tab === 'history' && <History entries={entries} onEdit={entry => { setEditing(entry); setTab('entry') }} onDelete={deleteEntry} />}
  </div>
}
