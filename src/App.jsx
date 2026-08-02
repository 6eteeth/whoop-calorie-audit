import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { supabase, isConfigured } from './lib/supabase'
import { calculateMetrics, totalWorkoutCalories } from './lib/analytics'
import WhoopPanel from './components/WhoopPanel'

const CONTACT_EMAIL = 'support@zcore.health'
const today = new Date().toISOString().slice(0, 10)
const emptyEntry = () => ({
  entry_date: today, weight_lb: '', calories_eaten: '', carbs_g: '', fat_g: '', protein_g: '', whoop_calories_burned: '', steps: '',
  whoop_day_strain: '', whoop_average_heart_rate: '', whoop_max_heart_rate: '', whoop_recovery_score: '', whoop_resting_heart_rate: '', whoop_hrv_rmssd_milli: '', whoop_spo2_percentage: '', whoop_skin_temp_celsius: '',
  whoop_sleep_duration_minutes: '', whoop_time_in_bed_minutes: '', whoop_awake_minutes: '', whoop_light_sleep_minutes: '', whoop_slow_wave_sleep_minutes: '', whoop_rem_sleep_minutes: '', whoop_sleep_performance_percentage: '', whoop_sleep_efficiency_percentage: '', whoop_sleep_consistency_percentage: '', whoop_respiratory_rate: '', whoop_disturbance_count: '', whoop_sleep_cycle_count: '', whoop_sleep_needed_minutes: '', whoop_synced_at: null,
  workout_1_type: 'None', workout_1_minutes: '', workout_1_whoop_calories: '',
  workout_2_type: 'None', workout_2_minutes: '', workout_2_whoop_calories: '',
  workout_3_type: 'None', workout_3_minutes: '', workout_3_whoop_calories: '', notes: '',
})
const workoutOptions = ['None', 'Strength', 'Cardio', 'StairMaster', 'Walking', 'Running', 'Cycling', 'Rowing', 'Sports', 'Other']
const formatNumber = (value, digits = 0) => Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: digits }) : '—'
const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const longDate = value => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const hasValue = value => value !== '' && value != null
const nutritionComplete = entry => [entry.carbs_g, entry.fat_g, entry.protein_g].every(hasValue)
const whoopComplete = entry => hasValue(entry.whoop_calories_burned)
const workoutComplete = entry => [1, 2, 3].some(n => hasValue(entry[`workout_${n}_minutes`]) || hasValue(entry[`workout_${n}_whoop_calories`]))
const entryCompletion = entry => ({ weight: hasValue(entry.weight_lb), nutrition: nutritionComplete(entry), whoop: whoopComplete(entry), workouts: workoutComplete(entry) })

function go(path) { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')) }
function Link({ href, children, className = '' }) { return <a className={className} href={href} onClick={e => { if (href.startsWith('/')) { e.preventDefault(); go(href) } }}>{children}</a> }

function Brand({ compact = false }) {
  return <Link href="/" className={`brand ${compact ? 'compact' : ''}`}>
    <img src="/zcore-mark.png" alt="ZCore" />
    <span><strong>ZCore</strong>{!compact && <small>Personal Metabolic Intelligence</small>}</span>
  </Link>
}

function PublicHeader() {
  return <header className="public-header"><div className="public-nav"><Brand />
    <nav className="site-nav"><Link href="/#features">Features</Link><Link href="/privacy">Privacy</Link><Link href="/contact">Contact</Link></nav>
    <Link href="/app" className="button button-primary">Open ZCore</Link>
  </div></header>
}

function PublicFooter() {
  return <footer className="public-footer"><div><Brand compact /><p>Built to turn personal health data into useful metabolic insight.</p></div>
    <div className="footer-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link><Link href="/app">Sign in</Link></div>
    <small>© {new Date().getFullYear()} ZCore. All rights reserved.</small>
  </footer>
}

function LandingPage() {
  return <div className="public-page"><PublicHeader />
    <main>
      <section className="hero"><div className="hero-copy"><span className="pill">Your data. Your metabolism. Clearer answers.</span>
        <h1>Understand what your body is actually doing.</h1>
        <p>ZCore brings calorie intake, body weight, workouts, and wearable data together to estimate your real energy expenditure and evaluate WHOOP calorie accuracy over time.</p>
        <div className="hero-actions"><Link href="/app" className="button button-primary button-large">Open ZCore</Link><a className="button button-secondary button-large" href="#how-it-works">See how it works</a></div>
        <div className="trust-row"><span>Private account</span><span>Cloud synchronized</span><span>Built for long-term trends</span></div>
      </div><div className="hero-visual"><img src="/zcore-logo-full.png" alt="ZCore Personal Metabolic Intelligence logo" /></div></section>

      <section id="features" className="section"><div className="section-intro"><span className="eyebrow">One personal health dashboard</span><h2>Less guesswork. Better context.</h2><p>ZCore focuses on the numbers that matter most and keeps the analysis understandable.</p></div>
        <div className="feature-grid">
          <Feature icon="↗" title="True expenditure estimate" text="Use calorie intake and weight trends to estimate actual daily energy expenditure instead of relying on a generic formula." />
          <Feature icon="◎" title="WHOOP accuracy analysis" text="Compare WHOOP-reported expenditure with your observed results and develop a personal correction factor." />
          <Feature icon="3×" title="Three workouts per day" text="Log separate workout types, durations, and WHOOP workout calories without combining unrelated sessions." />
          <Feature icon="⌁" title="Trend-first design" text="Daily fluctuations are noisy. ZCore emphasizes rolling averages and longer observation windows." />
          <Feature icon="☁" title="Secure cloud sync" text="Your entries stay connected across phone, tablet, home computer, and office computer." />
          <Feature icon="◉" title="WHOOP-ready foundation" text="Designed to support automatic imports for workouts, recovery, sleep, and other authorized WHOOP data." />
        </div>
      </section>

      <section id="how-it-works" className="section dark-section"><div className="section-intro"><span className="eyebrow">How it works</span><h2>A model that improves as your history grows.</h2></div>
        <div className="steps"><Step n="01" title="Log the essentials" text="Enter morning weight, calories eaten, WHOOP total expenditure, and optional nutrition and workout details." /><Step n="02" title="Let trends stabilize" text="ZCore evaluates rolling windows rather than treating one unusual weigh-in as meaningful." /><Step n="03" title="Calibrate your numbers" text="Over time, ZCore estimates actual TDEE and shows whether WHOOP tends to run high or low for you." /></div>
      </section>

      <section className="section cta"><img src="/zcore-mark.png" alt="" /><div><span className="eyebrow">Personal metabolic intelligence</span><h2>Start building a clearer picture of your metabolism.</h2></div><Link href="/app" className="button button-primary button-large">Sign in to ZCore</Link></section>
    </main><PublicFooter /></div>
}

function Feature({ icon, title, text }) { return <article className="feature-card"><span className="feature-icon">{icon}</span><h3>{title}</h3><p>{text}</p></article> }
function Step({ n, title, text }) { return <article className="step"><span>{n}</span><h3>{title}</h3><p>{text}</p></article> }

function LegalLayout({ title, updated, children }) {
  return <div className="public-page"><PublicHeader /><main className="legal-shell"><span className="eyebrow">ZCore legal</span><h1>{title}</h1><p className="legal-updated">Last updated: {updated}</p><div className="legal-card">{children}</div></main><PublicFooter /></div>
}
function PrivacyPage() {
  return <LegalLayout title="Privacy Policy" updated="August 2, 2026">
    <p>ZCore is a personal health analytics application. This policy explains what information ZCore collects, why it is used, and the choices available to users.</p>
    <h2>Information collected</h2><p>ZCore may collect account information such as your email address, information you enter such as body weight, calorie intake, protein, steps, notes, and workout details, and data you authorize ZCore to retrieve from connected services such as WHOOP.</p>
    <h2>WHOOP data</h2><p>When you connect WHOOP, ZCore may request access to authorized categories such as profile information, body measurements, cycles, recovery, sleep, and workouts. ZCore only accesses categories you approve through WHOOP's authorization screen.</p>
    <h2>How information is used</h2><p>Information is used to provide account access, synchronize entries across devices, display dashboards and trends, estimate energy expenditure, evaluate wearable calorie estimates, and improve the reliability of your personal analytics.</p>
    <h2>Data sharing and sale</h2><p>ZCore does not sell personal information. ZCore does not share personal health information with advertisers. Information may be processed by service providers that support the application, including Supabase for authentication and database storage, Netlify for hosting and server functions, and WHOOP when you choose to connect your WHOOP account.</p>
    <h2>Security</h2><p>ZCore uses authenticated accounts, encrypted HTTPS connections, and database access controls intended to restrict each user to their own records. No online service can guarantee absolute security.</p>
    <h2>Data retention and deletion</h2><p>Information is retained while your account remains active or as needed to provide the service. You may request deletion of your account and associated data by contacting <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    <h2>Your choices</h2><p>You may choose which information to enter, disconnect third-party integrations, revoke WHOOP authorization through WHOOP, or request deletion of your ZCore account.</p>
    <h2>Children</h2><p>ZCore is not directed to children under 13 and does not knowingly collect personal information from children under 13.</p>
    <h2>Changes</h2><p>This policy may be updated as ZCore develops. The current version and update date will remain available on this page.</p>
    <h2>Contact</h2><p>Privacy questions and deletion requests may be sent to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
  </LegalLayout>
}
function TermsPage() {
  return <LegalLayout title="Terms of Service" updated="August 2, 2026">
    <p>These terms govern use of ZCore. By using ZCore, you agree to these terms.</p>
    <h2>Personal analytics, not medical care</h2><p>ZCore provides informational estimates and trend analysis. It does not provide medical diagnosis, treatment, or emergency services. Calorie expenditure, body-composition, and metabolic estimates may be inaccurate and should not replace advice from a qualified healthcare professional.</p>
    <h2>Your account</h2><p>You are responsible for maintaining the confidentiality of your login credentials and for activity performed through your account. Information entered into ZCore should be accurate to the best of your knowledge.</p>
    <h2>Permitted use</h2><p>You may use ZCore for lawful personal purposes. You may not attempt to access another user's data, interfere with the service, reverse engineer protected server systems, or use ZCore to violate applicable law or third-party rights.</p>
    <h2>Third-party services</h2><p>ZCore may connect with services such as WHOOP, Supabase, and Netlify. Those services are governed by their own terms and policies. Availability of third-party integrations may change.</p>
    <h2>No warranty</h2><p>ZCore is provided on an “as is” and “as available” basis. To the extent permitted by law, no warranty is made that the service will always be available, error-free, or suitable for a particular health or fitness decision.</p>
    <h2>Limitation of liability</h2><p>To the extent permitted by law, ZCore and its operator are not liable for indirect, incidental, special, consequential, or punitive damages arising from use of the service or reliance on its estimates.</p>
    <h2>Termination and deletion</h2><p>You may stop using ZCore at any time. Account deletion requests may be sent to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Access may be suspended for misuse, security threats, or legal requirements.</p>
    <h2>Changes</h2><p>These terms may be updated as the service evolves. Continued use after an update constitutes acceptance of the revised terms.</p>
    <h2>Contact</h2><p>Questions may be sent to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
  </LegalLayout>
}
function ContactPage() {
  return <div className="public-page"><PublicHeader /><main className="contact-shell"><div><span className="eyebrow">Contact ZCore</span><h1>Questions, privacy requests, or integration support.</h1><p>For account help, data deletion, privacy questions, or WHOOP integration support, email the address below.</p><a className="contact-email" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></div><img src="/zcore-mark.png" alt="ZCore mark" /></main><PublicFooter /></div>
}

function AuthScreen() {
  const [mode, setMode] = useState('signin'), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  async function submit(event) { event.preventDefault(); setBusy(true); setMessage(''); const credentials = { email, password }; const result = mode === 'signin' ? await supabase.auth.signInWithPassword(credentials) : await supabase.auth.signUp(credentials); setBusy(false); if (result.error) setMessage(result.error.message); else if (mode === 'signup' && !result.data.session) setMessage('Account created. Confirm your email, then sign in.') }
  return <main className="auth-page"><Link href="/" className="back-link">← Back to zcore.health</Link><form className="auth-card" onSubmit={submit}><img className="auth-logo" src="/zcore-mark.png" alt="ZCore" /><span className="eyebrow">Personal metabolic intelligence</span><h1>ZCore</h1><p>Sign in to sync your health data across all devices.</p><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength="6" required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} /></label>{message && <div className="message">{message}</div>}<button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button><button type="button" className="text-button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'Create a new account' : 'Use an existing account'}</button><div className="auth-legal">By continuing, you agree to the <Link href="/terms">Terms</Link> and acknowledge the <Link href="/privacy">Privacy Policy</Link>.</div></form></main>
}
function SetupScreen() { return <main className="auth-page"><section className="auth-card"><Brand /><h1>Connect ZCore</h1><p>Add your Supabase Project URL and publishable key as Netlify environment variables:</p><code>VITE_SUPABASE_URL</code><br /><code>VITE_SUPABASE_PUBLISHABLE_KEY</code></section></main> }

function Dashboard({ entries }) {
  const metrics = useMemo(() => calculateMetrics(entries, 28), [entries])
  const weightRows = entries.filter(e => hasValue(e.weight_lb)).slice(-30)
  const calorieRows = entries.filter(e => hasValue(e.calories_eaten) || hasValue(e.whoop_calories_burned)).slice(-30)
  const latestWeight = weightRows.at(-1)
  const yesterdayDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const todayEntry = entries.find(e => e.entry_date === today) || emptyEntry()
  const yesterdayEntry = entries.find(e => e.entry_date === yesterdayDate) || { ...emptyEntry(), entry_date: yesterdayDate }
  const tasks = [
    { label: "Record today's weight", done: hasValue(todayEntry.weight_lb) },
    { label: "Sync yesterday's WHOOP data", done: whoopComplete(yesterdayEntry) },
    { label: "Enter yesterday's macros", done: nutritionComplete(yesterdayEntry) },
  ]
  const weightData = { labels: weightRows.map(e => dateLabel(e.entry_date)), datasets: [{ label: 'Weight', data: weightRows.map(e => Number(e.weight_lb)), tension: 0.32, borderColor: '#ff1493', backgroundColor: 'rgba(255,20,147,.12)', pointRadius: 3 }] }
  const calorieData = { labels: calorieRows.map(e => dateLabel(e.entry_date)), datasets: [{ label: 'Calories eaten', data: calorieRows.map(e => hasValue(e.calories_eaten) ? Number(e.calories_eaten) : null), backgroundColor: 'rgba(17,24,39,.78)' }, { label: 'WHOOP total calories', data: calorieRows.map(e => hasValue(e.whoop_calories_burned) ? Number(e.whoop_calories_burned) : null), backgroundColor: 'rgba(255,20,147,.72)' }] }
  return <>
    <section className="task-card"><div><span className="eyebrow">Daily workflow</span><h2>Today's tasks</h2></div><div className="task-list">{tasks.map(task => <div className={`task-item ${task.done ? 'done' : ''}`} key={task.label}><span>{task.done ? '✓' : '○'}</span><strong>{task.label}</strong></div>)}</div></section>
    <div className="metric-grid"><Metric label="Current weight" value={latestWeight ? `${formatNumber(Number(latestWeight.weight_lb), 1)} lb` : '—'} /><Metric label="28-day average intake" value={metrics ? formatNumber(metrics.avgIntake) : '—'} /><Metric label="Estimated actual TDEE" value={metrics?.estimatedActual ? formatNumber(metrics.estimatedActual) : '—'} /><Metric label="WHOOP correction factor" value={metrics?.correction ? metrics.correction.toFixed(3) : '—'} /></div>
    <section className="insight-card"><div className="insight-head"><span className="feature-icon">◎</span><div><span className="eyebrow">Current analysis</span><h2>WHOOP accuracy</h2></div></div>{!metrics || metrics.sampleDays < 2 ? <p>Add at least two complete days containing weight, nutrition, and WHOOP expenditure to begin estimating accuracy.</p> : <><p>Over the last 28 days, WHOOP appears to be <strong>{metrics.error >= 0 ? 'overestimating' : 'underestimating'}</strong> expenditure by approximately <strong>{formatNumber(Math.abs(metrics.error))} calories per day</strong> ({formatNumber(Math.abs(metrics.errorPct), 1)}%).</p><small>This remains preliminary until you have at least 28–56 consistent days. Food logging and water-weight changes can affect the estimate.</small></>}</section>
    <section className="chart-grid"><div className="chart-card"><h2>Weight trend</h2><div className="chart-wrap"><Line data={weightData} options={{ responsive: true, maintainAspectRatio: false, spanGaps: true }} /></div></div><div className="chart-card"><h2>Intake vs. WHOOP</h2><div className="chart-wrap"><Bar data={calorieData} options={{ responsive: true, maintainAspectRatio: false }} /></div></div></section>
  </>
}
function Metric({ label, value }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div> }
function EntryForm({ entry, entries, onSave, onCancel }) {
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
    if (!selectedDate) return
    const requestId = ++syncRequest.current
    setSyncing(true)
    setSyncMessage(automatic ? `Loading saved and WHOOP data for ${longDate(selectedDate)}…` : '')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Please sign in again.')
      const response = await fetch('/.netlify/functions/whoop-sync-day', {
        method: 'POST',
        headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ date: selectedDate }),
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
    await syncSelectedDay(selectedDate, base, true)
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    await onSave({ ...form, calories_eaten: calculatedCalories })
    setBusy(false)
  }
  const sleepHours = form.whoop_sleep_duration_minutes === '' ? '—' : `${(Number(form.whoop_sleep_duration_minutes) / 60).toFixed(1)} hr`

  return <form className="entry-card" onSubmit={submit}>
    <div className="section-heading"><div><span className="eyebrow">Daily log</span><h2>{form.id ? `Edit ${longDate(form.entry_date)}` : 'Add daily entry'}</h2><small>Save any amount of progress now, then return to the same date later to add nutrition or WHOOP data.</small></div><button type="button" className="button button-pink" onClick={() => syncSelectedDay()} disabled={syncing || !form.entry_date}>{syncing ? 'Loading WHOOP…' : 'Refresh selected day'}</button></div>
    {syncMessage && <div className="message">{syncMessage}</div>}
    <div className="completion-strip">{[['Weight', completion.weight], ['Nutrition', completion.nutrition], ['WHOOP', completion.whoop], ['Workouts', completion.workouts]].map(([label, done]) => <span className={done ? 'complete' : ''} key={label}>{done ? '✓' : '○'} {label}</span>)}</div>
    <div className="form-grid">
      <label>Date<input type="date" value={form.entry_date} onChange={e => selectDate(e.target.value)} required /></label>
      <label>Morning weight (lb)<input type="number" step="0.1" min="1" value={form.weight_lb} onChange={e => update('weight_lb', e.target.value)} /></label>
      <div className="macro-panel full"><div><span className="eyebrow">Nutrition</span><h3>Enter macros; ZCore calculates calories</h3></div><div className="macro-total"><span>Calculated calories</span><strong>{calculatedCalories == null ? '—' : calculatedCalories.toLocaleString()}</strong><small>Carbs × 4 + protein × 4 + fat × 9</small></div></div>
      <label>Carbohydrates (g)<input type="number" min="0" step="0.1" value={form.carbs_g ?? ''} onChange={e => update('carbs_g', e.target.value)} /></label>
      <label>Fat (g)<input type="number" min="0" step="0.1" value={form.fat_g ?? ''} onChange={e => update('fat_g', e.target.value)} /></label>
      <label>Protein (g)<input type="number" min="0" step="0.1" value={form.protein_g ?? ''} onChange={e => update('protein_g', e.target.value)} /></label>
      <label>WHOOP total calories burned<input type="number" min="0" value={form.whoop_calories_burned} onChange={e => update('whoop_calories_burned', e.target.value)} /><small className="field-note">Automatically filled from the matched WHOOP physiological cycle.</small></label>
      <label>Steps (manual)<input type="number" min="0" value={form.steps ?? ''} onChange={e => update('steps', e.target.value)} /><small className="field-note">WHOOP's official developer API does not currently provide step counts.</small></label>
      {[1,2,3].map(n => <div className="workout-group full" key={n}><h3>Workout {n}</h3><div className="workout-grid"><label>Type<input list="workout-types" value={form[`workout_${n}_type`] || 'None'} onChange={e => update(`workout_${n}_type`, e.target.value)} /></label><label>Minutes<input type="number" min="0" value={form[`workout_${n}_minutes`] ?? ''} onChange={e => update(`workout_${n}_minutes`, e.target.value)} /></label><label>WHOOP workout calories<input type="number" min="0" value={form[`workout_${n}_whoop_calories`] ?? ''} onChange={e => update(`workout_${n}_whoop_calories`, e.target.value)} /></label></div></div>)}
      <datalist id="workout-types">{workoutOptions.map(option => <option key={option} value={option} />)}</datalist>
      <div className="whoop-import-card full"><div className="section-heading"><div><span className="eyebrow">WHOOP selected-day data</span><h3>Recovery, strain, heart rate, and sleep</h3></div>{form.whoop_synced_at && <small>Synced {new Date(form.whoop_synced_at).toLocaleString()}</small>}</div><div className="metric-grid imported-metrics"><Metric label="Day strain" value={form.whoop_day_strain === '' ? '—' : Number(form.whoop_day_strain).toFixed(1)} /><Metric label="Recovery" value={form.whoop_recovery_score === '' ? '—' : `${form.whoop_recovery_score}%`} /><Metric label="Resting HR" value={form.whoop_resting_heart_rate === '' ? '—' : `${form.whoop_resting_heart_rate} bpm`} /><Metric label="HRV" value={form.whoop_hrv_rmssd_milli === '' ? '—' : `${Number(form.whoop_hrv_rmssd_milli).toFixed(1)} ms`} /><Metric label="Sleep" value={sleepHours} /><Metric label="Sleep performance" value={form.whoop_sleep_performance_percentage === '' ? '—' : `${form.whoop_sleep_performance_percentage}%`} /><Metric label="Sleep efficiency" value={form.whoop_sleep_efficiency_percentage === '' ? '—' : `${Number(form.whoop_sleep_efficiency_percentage).toFixed(1)}%`} /><Metric label="Respiratory rate" value={form.whoop_respiratory_rate === '' ? '—' : Number(form.whoop_respiratory_rate).toFixed(1)} /></div><details><summary>View all imported WHOOP values</summary><div className="data-detail-grid"><span>Average HR <strong>{form.whoop_average_heart_rate || '—'}</strong></span><span>Max HR <strong>{form.whoop_max_heart_rate || '—'}</strong></span><span>SpO₂ <strong>{form.whoop_spo2_percentage === '' ? '—' : `${Number(form.whoop_spo2_percentage).toFixed(1)}%`}</strong></span><span>Skin temperature <strong>{form.whoop_skin_temp_celsius === '' ? '—' : `${Number(form.whoop_skin_temp_celsius).toFixed(1)} °C`}</strong></span><span>Time in bed <strong>{form.whoop_time_in_bed_minutes || '—'} min</strong></span><span>Awake <strong>{form.whoop_awake_minutes || '—'} min</strong></span><span>Light sleep <strong>{form.whoop_light_sleep_minutes || '—'} min</strong></span><span>Slow-wave sleep <strong>{form.whoop_slow_wave_sleep_minutes || '—'} min</strong></span><span>REM sleep <strong>{form.whoop_rem_sleep_minutes || '—'} min</strong></span><span>Sleep consistency <strong>{form.whoop_sleep_consistency_percentage === '' ? '—' : `${form.whoop_sleep_consistency_percentage}%`}</strong></span><span>Sleep needed <strong>{form.whoop_sleep_needed_minutes || '—'} min</strong></span><span>Disturbances <strong>{form.whoop_disturbance_count || '—'}</strong></span></div></details></div>
      <label className="full">Notes<textarea rows="3" value={form.notes ?? ''} onChange={e => update('notes', e.target.value)} /></label>
    </div>
    <div className="button-row"><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save progress'}</button>{onCancel && <button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button>}</div>
  </form>
}
function History({ entries, onEdit, onDelete }) { return <section className="table-card"><div className="section-heading"><div><span className="eyebrow">Your records</span><h2>History</h2></div></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Status</th><th>Weight</th><th>Calories</th><th>Carbs</th><th>Fat</th><th>Protein</th><th>WHOOP total</th><th>Workout calories</th><th>Recovery</th><th>Sleep</th><th></th></tr></thead><tbody>{[...entries].reverse().map(entry => { const status = entryCompletion(entry); const completed = Object.values(status).filter(Boolean).length; return <tr key={entry.id}><td><button className="link-button" onClick={() => onEdit(entry)}>{longDate(entry.entry_date)}</button></td><td><span className="completion-badge">{completed}/4</span></td><td>{hasValue(entry.weight_lb) ? `${entry.weight_lb} lb` : '—'}</td><td>{hasValue(entry.calories_eaten) ? entry.calories_eaten : '—'}</td><td>{entry.carbs_g ?? '—'}</td><td>{entry.fat_g ?? '—'}</td><td>{entry.protein_g ?? '—'}</td><td>{hasValue(entry.whoop_calories_burned) ? entry.whoop_calories_burned : '—'}</td><td>{workoutComplete(entry) ? totalWorkoutCalories(entry) : '—'}</td><td>{entry.whoop_recovery_score == null ? '—' : `${entry.whoop_recovery_score}%`}</td><td>{entry.whoop_sleep_duration_minutes == null ? '—' : `${(Number(entry.whoop_sleep_duration_minutes)/60).toFixed(1)} hr`}</td><td><button className="danger" onClick={() => onDelete(entry)}>Delete</button></td></tr>})}</tbody></table></div></section> }


function AppArea() {
  const [session, setSession] = useState(null), [loading, setLoading] = useState(true), [entries, setEntries] = useState([]), [tab, setTab] = useState('dashboard'), [editing, setEditing] = useState(emptyEntry()), [message, setMessage] = useState('')
  useEffect(() => { if (!isConfigured) { setLoading(false); return } supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) }); const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession)); return () => listener.subscription.unsubscribe() }, [])
  useEffect(() => { if (session) loadEntries() }, [session])
  async function loadEntries() { const { data, error } = await supabase.from('daily_entries').select('*').order('entry_date', { ascending: true }); if (error) setMessage(error.message); else setEntries(data || []) }
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
      notes: form.notes || null,
      whoop_synced_at: form.whoop_synced_at || null,
    }
    const whoopFields = ['whoop_day_strain','whoop_average_heart_rate','whoop_max_heart_rate','whoop_recovery_score','whoop_resting_heart_rate','whoop_hrv_rmssd_milli','whoop_spo2_percentage','whoop_skin_temp_celsius','whoop_sleep_duration_minutes','whoop_time_in_bed_minutes','whoop_awake_minutes','whoop_light_sleep_minutes','whoop_slow_wave_sleep_minutes','whoop_rem_sleep_minutes','whoop_sleep_performance_percentage','whoop_sleep_efficiency_percentage','whoop_sleep_consistency_percentage','whoop_respiratory_rate','whoop_disturbance_count','whoop_sleep_cycle_count','whoop_sleep_needed_minutes']
    whoopFields.forEach(field => { payload[field] = nullableNumber(form[field]) })
    for (const n of [1,2,3]) {
      payload[`workout_${n}_type`] = form[`workout_${n}_type`] || 'None'
      payload[`workout_${n}_minutes`] = nullableNumber(form[`workout_${n}_minutes`])
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
  return <div className="app-bg"><div className="app-shell"><header className="app-header"><Brand /><div className="app-header-actions"><Link href="/" className="text-link">Website</Link><button className="button button-secondary" onClick={() => supabase.auth.signOut()}>Sign out</button></div></header><nav className="app-nav">{[['dashboard','Dashboard'],['entry','Daily entry'],['history','History'],['whoop','WHOOP']].map(([id,label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => { setTab(id); if (id === 'entry') setEditing(emptyEntry()) }}>{label}</button>)}</nav>{message && <div className="message">{message}</div>}{tab === 'dashboard' && <Dashboard entries={entries} />}{tab === 'entry' && <EntryForm key={editing.id || editing.entry_date} entry={editing} entries={entries} onSave={saveEntry} onCancel={editing.id ? () => { setEditing(emptyEntry()); setTab('history') } : null} />}{tab === 'history' && <History entries={entries} onEdit={entry => { setEditing(entry); setTab('entry') }} onDelete={deleteEntry} />}{tab === 'whoop' && <WhoopPanel />}</div></div>
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => { const update = () => setPath(window.location.pathname); window.addEventListener('popstate', update); return () => window.removeEventListener('popstate', update) }, [])
  if (path === '/privacy') return <PrivacyPage />
  if (path === '/terms') return <TermsPage />
  if (path === '/contact') return <ContactPage />
  if (path === '/app' || path.startsWith('/app/')) return <AppArea />
  return <LandingPage />
}
