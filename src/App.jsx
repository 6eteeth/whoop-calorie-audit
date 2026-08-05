import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { supabase, isConfigured } from './lib/supabase'
import { calculateMetrics, totalWorkoutCalories } from './lib/analytics'
import WhoopPanel from './components/WhoopPanel'

const CONTACT_EMAIL = 'support@zcore.health'
const localDateKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
      timer = window.setTimeout(() => {
        setDateKey(localDateKey())
        schedule()
      }, nextMidnight.getTime() - now.getTime() + 250)
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
  workout_1_type: 'None', workout_1_minutes: '', workout_1_calories: '', workout_1_whoop_calories: '',
  workout_2_type: 'None', workout_2_minutes: '', workout_2_calories: '', workout_2_whoop_calories: '',
  workout_3_type: 'None', workout_3_minutes: '', workout_3_calories: '', workout_3_whoop_calories: '', used_ai_calorie_estimate: false, caffeine_after_3pm: false, alcohol_consumed: false, notes: '',
})
const workoutOptions = ['None', 'Strength', 'Cardio', 'StairMaster', 'Walking', 'Running', 'Cycling', 'Rowing', 'Sports', 'Other']
const formatNumber = (value, digits = 0) => Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: digits }) : '—'
const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const longDate = value => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const hasValue = value => value !== '' && value != null
const nutritionComplete = entry => [entry.carbs_g, entry.fat_g, entry.protein_g].every(hasValue)
const whoopComplete = entry => [
  entry.whoop_calories_burned,
  entry.whoop_day_strain,
  entry.whoop_recovery_score,
  entry.whoop_resting_heart_rate,
  entry.whoop_hrv_rmssd_milli,
  entry.whoop_sleep_duration_minutes,
].every(hasValue)
const workoutComplete = entry => [1, 2, 3].some(n => hasValue(entry[`workout_${n}_minutes`]) || hasValue(entry[`workout_${n}_calories`]) || hasValue(entry[`workout_${n}_whoop_calories`]))
const entryCompletion = entry => ({ weight: hasValue(entry.weight_lb), nutrition: nutritionComplete(entry), workouts: workoutComplete(entry), whoop: whoopComplete(entry) })

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
    <nav className="site-nav"><Link href="/#features">Features</Link><Link href="/about">About</Link><Link href="/consistency">Consistency</Link><Link href="/learning">Learning Center</Link><Link href="/privacy">Privacy</Link></nav>
    <Link href="/app" className="button button-primary">Open ZCore</Link>
  </div></header>
}

function PublicFooter() {
  return <footer className="public-footer"><div><Brand compact /><p>Learn your metabolism by understanding how Calories In vs. Calories Out affects your body.</p></div>
    <div className="footer-links"><Link href="/about">About</Link><Link href="/consistency">Consistency</Link><Link href="/learning">Learning Center</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link><Link href="/app">Sign in</Link></div>
    <small>© {new Date().getFullYear()} ZCore. All rights reserved.</small>
  </footer>
}

function LandingPage() {
  return <div className="public-page"><PublicHeader />
    <main>
      <section className="hero"><div className="hero-copy"><span className="pill">Calories In vs. Calories Out—made personal.</span>
        <h1>Learn Your Metabolism</h1>
        <p className="hero-kicker">Understand how <strong>Calories In vs. Calories Out</strong> affects your body.</p>
        <p>No fad diets. No guessing. Just your data—connected over time to reveal how your nutrition, activity, and weight actually work together.</p>
        <div className="hero-actions"><Link href="/app" className="button button-primary button-large">Get Started</Link><a className="button button-secondary button-large" href="#how-it-works">See how it works</a></div>
        <div className="trust-row"><span>No wearable required</span><span>Private account</span><span>Built for long-term trends</span></div>
      </div><div className="hero-visual"><img src="/zcore-logo-full.png" alt="ZCore Personal Metabolic Intelligence logo" /></div></section>

      <section id="features" className="section"><div className="section-intro"><span className="eyebrow">Stop guessing. Start measuring.</span><h2>ZCore connects the numbers other apps keep separate.</h2><p>Most apps count calories, track workouts, or record weight. ZCore combines all three so you can learn what Calories In vs. Calories Out means for your body—not someone else's.</p></div>
        <div className="feature-grid">
          <Feature icon="C" title="Nutrition" text="Log carbohydrates, protein, and fat. ZCore calculates calorie intake consistently from your macros." />
          <Feature icon="W" title="Body" text="Track morning weight and watch rolling trends reveal meaningful change beneath daily fluctuations." />
          <Feature icon="A" title="Activity" text="Record steps and up to three workouts each day, with or without a wearable." />
          <Feature icon="↗" title="True expenditure estimate" text="Use calorie intake and weight trends to estimate actual daily energy expenditure instead of relying only on generic formulas." />
          <Feature icon="◎" title="Wearable comparison" text="Compare ZCore's observed metabolic estimate with a connected wearable's calorie estimate when available." />
          <Feature icon="⌁" title="Daily context" text="Track AI-estimated meals, late caffeine, and alcohol so future analysis can identify patterns and uncertainty." />
        </div>
      </section>

      <section className="section questions-section"><div className="section-intro"><span className="eyebrow">Learn from your data</span><h2>Turn daily logs into answers.</h2><p>ZCore is designed to help you investigate the questions that matter—not just collect more numbers.</p></div>
        <div className="question-grid">
          {['Why did my weight go up?', 'What are my true maintenance calories?', 'Is my wearable overestimating calories?', 'How accurate are my calorie estimates?', 'How do sleep and recovery affect my progress?', 'Are my macros producing the results I expected?'].map(question => <article className="question-card" key={question}><span>?</span><h3>{question}</h3></article>)}
        </div>
      </section>

      <section id="how-it-works" className="section dark-section"><div className="section-intro"><span className="eyebrow">How it works</span><h2>A personal model that improves as your history grows.</h2></div>
        <div className="steps"><Step n="01" title="Log the essentials" text="Enter morning weight, macros, steps, and workout details. ZCore calculates Calories In automatically." /><Step n="02" title="Observe the trend" text="ZCore compares intake with changes in body weight over rolling windows instead of reacting to one noisy day." /><Step n="03" title="Learn your metabolism" text="As your history grows, ZCore estimates maintenance calories, weight-change rate, and wearable bias when one is connected." /></div>
      </section>

      <section className="section wearable-section"><div className="section-intro"><span className="eyebrow">Optional wearable integrations</span><h2>Wearables enhance your data. They are not required.</h2><p>ZCore's core experience works with weight, macros, steps, and workouts. Connect a wearable only when you want automatic activity, sleep, recovery, or calorie data.</p></div>
        <div className="wearable-grid">
          <article className="wearable-card available"><span className="status-label">Connected today</span><h3>WHOOP</h3><p>Automatic workouts, calories, strain, recovery, heart rate, HRV, and sleep data.</p></article>
          {['Garmin', 'Apple Health', 'Fitbit', 'Oura'].map(name => <article className="wearable-card" key={name}><span className="status-label">Coming soon</span><h3>{name}</h3><p>Planned as an optional data source for broader activity and health context.</p></article>)}
        </div>
        <p className="wearable-mantra"><strong>Wearables are optional. Your data isn't.</strong></p>
      </section>

      <section className="section story-preview"><div className="story-preview-copy"><span className="eyebrow">Why ZCore exists</span><h2>Built from a real weight-loss journey.</h2><p>ZCore began with a simple frustration: calorie intake, wearable estimates, workouts, and scale weight rarely lived in one place. Zac built ZCore to connect those numbers and learn what they meant for his own body.</p><div className="hero-actions"><Link href="/about" className="button button-primary">Read Zac’s story</Link><Link href="/consistency" className="button button-secondary">Learn the method</Link></div></div><img src="/zach-portrait.jpg" alt="Zac, founder of ZCore" /></section>

      <section className="section learning-preview"><div className="section-intro"><span className="eyebrow">Learning Center</span><h2>Build better habits by understanding the basics.</h2><p>Explore curated videos about calorie balance, fat loss, protein, training, and metabolic health.</p></div><Link href="/learning" className="button button-secondary">Explore the Learning Center</Link></section>

      <section className="section cta"><img src="/zcore-mark.png" alt="" /><div><span className="eyebrow">Learn your metabolism</span><h2>Calories In. Calories Out. Finally understand what the difference means for your body.</h2></div><Link href="/app" className="button button-primary button-large">Start with ZCore</Link></section>
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


const HEALTH_VIDEOS = [
  'KCK9s5Aa5kg','aJFiGC13xIw','K4Ze-Sp6aUE','Pok0Jg2JAkE','vYQaLV3Fm00','ELxTSv-5Ykg','h_1zlead9ZU','_FJSotplMMQ','QVgeB5iWcBc','2bv9kB7yvjQ','HIX_PRZeRW8'
]
function AboutPage() {
  return <div className="public-page"><PublicHeader /><main>
    <section className="about-hero section"><div><span className="eyebrow">About ZCore</span><h1>Hi, I’m Zac.</h1><p className="hero-kicker">ZCore grew out of my own effort to understand weight loss with better data—not more guessing.</p><p>I spent years counting calories, exercising, weighing myself, and trying to make sense of results that did not always match the numbers. The problem was not a lack of effort. The information was scattered across food logs, scale readings, workouts, and wearable estimates.</p><p>I wanted one place where Calories In, Calories Out, and changes in body weight could be viewed together over time. That idea became ZCore.</p></div><img src="/zach-portrait.jpg" alt="Zac, founder of ZCore" /></section>
    <section className="section journey-section"><div className="journey-photo"><img src="/zach-journey.jpg" alt="Zac during his weight-loss journey with someone important to him" /></div><div><span className="eyebrow">My weight-loss journey</span><h2>Health became more meaningful when I stopped chasing perfect days.</h2><p>My progress came from learning to value consistency: weighing food, logging honestly, using the same scale under similar conditions, and judging trends across weeks instead of reacting to one morning.</p><p>That experience shaped ZCore. The app is not designed to shame imperfect days or demand a wearable. It is designed to help people collect reliable evidence, recognize patterns, and make informed decisions about their own habits.</p><p>Health is not only about appearance. It is about energy, confidence, longevity, and being present for the people who matter.</p></div></section>
    <section className="section founder-values"><div className="section-intro"><span className="eyebrow">What I believe</span><h2>Consistency beats perfection.</h2></div><div className="feature-grid"><Feature icon="1" title="Measure honestly" text="Useful analysis starts with truthful inputs, including days that are difficult to estimate."/><Feature icon="2" title="Follow trends" text="One weigh-in is noise. Repeated measurements under consistent conditions create a signal."/><Feature icon="3" title="Use wearables as evidence" text="Wearable data can add context, but ZCore’s purpose is to learn from your body—not blindly trust a device."/></div></section>
  </main><PublicFooter /></div>
}
function ConsistencyPage() {
  return <div className="public-page"><PublicHeader /><main className="guide-shell">
    <section className="guide-hero"><span className="eyebrow">The ZCore method</span><h1>Consistency Beats Perfection</h1><p>Accurate metabolic estimates do not require flawless days. They require measurements taken in a repeatable way.</p></section>
    <section className="guide-grid"><article><span>01</span><h2>Weigh food when possible</h2><p>Portion estimates can drift quickly. A food scale creates a repeatable standard and reduces hidden error from oils, condiments, and serving sizes.</p></article><article><span>02</span><h2>Log honestly</h2><p>Do not change a number because it feels too high or too low. Honest data—even imperfect data—is more useful than a polished record that does not reflect reality.</p></article><article><span>03</span><h2>Weigh yourself consistently</h2><p>Use the same scale at roughly the same time each day. Morning, after using the bathroom and before eating or drinking, is usually the easiest repeatable routine.</p></article><article><span>04</span><h2>Judge weeks, not mornings</h2><p>Sodium, carbohydrates, digestion, hydration, and training can move scale weight. Weekly averages reveal progress more clearly than isolated daily changes.</p></article></section>
    <section className="section consistency-callout"><div><span className="eyebrow">Context matters</span><h2>Some days carry more uncertainty.</h2><p>ZCore tracks whether calories were AI-assisted, whether alcohol was consumed, and whether caffeine was used after 3 PM. These flags help future analysis separate measurement error and lifestyle effects from true changes in energy balance.</p></div><Link href="/app" className="button button-primary">Start logging consistently</Link></section>
  </main><PublicFooter /></div>
}
function LearningPage() {
  return <div className="public-page"><PublicHeader /><main className="learning-shell"><section className="learning-hero"><span className="eyebrow">ZCore Learning Center</span><h1>Learn the principles behind sustainable progress.</h1><p>This curated video library covers calories, nutrition, training, fat loss, and metabolic health. Videos open directly on YouTube.</p></section><section className="video-grid">{HEALTH_VIDEOS.map((id, index) => <article className="video-card" key={id}><a href={`https://youtu.be/${id}`} target="_blank" rel="noreferrer"><img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt={`Health education video ${index + 1}`} /><div className="video-card-body"><span className="status-label">Curated video {index + 1}</span><h2>Health, nutrition, and metabolism</h2><p>Watch this selected resource and consider how the ideas apply to your own long-term data.</p><strong>Watch on YouTube →</strong></div></a></article>)}</section><p className="resource-note">External videos are provided for education and do not constitute medical advice or endorsement of every statement made by a creator.</p></main><PublicFooter /></div>
}


function AppLearningCenter() {
  return <section className="learning-shell app-learning-center"><section className="learning-hero"><span className="eyebrow">ZCore Learning Center</span><h1>Learn the principles behind sustainable progress.</h1><p>Explore curated videos about calories, nutrition, training, fat loss, and metabolic health while signed in to ZCore.</p></section><section className="video-grid">{HEALTH_VIDEOS.map((id, index) => <article className="video-card" key={id}><a href={`https://youtu.be/${id}`} target="_blank" rel="noreferrer"><img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt={`Health education video ${index + 1}`} /><div className="video-card-body"><span className="status-label">Curated video {index + 1}</span><h2>Health, nutrition, and metabolism</h2><p>Watch this selected resource and consider how the ideas apply to your own long-term data.</p><strong>Watch on YouTube →</strong></div></a></article>)}</section><p className="resource-note">External videos are provided for education and do not constitute medical advice or endorsement of every statement made by a creator.</p></section>
}

function AuthScreen() {
  const [mode, setMode] = useState('signin'), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  async function submit(event) { event.preventDefault(); setBusy(true); setMessage(''); const credentials = { email, password }; const result = mode === 'signin' ? await supabase.auth.signInWithPassword(credentials) : await supabase.auth.signUp({ ...credentials, options: { emailRedirectTo: 'https://zcore.health/app' } }); setBusy(false); if (result.error) setMessage(result.error.message); else if (mode === 'signup' && !result.data.session) setMessage('Account created. Confirm your email, then sign in.') }
  return <main className="auth-page"><Link href="/" className="back-link">← Back to zcore.health</Link><form className="auth-card" onSubmit={submit}><img className="auth-logo" src="/zcore-mark.png" alt="ZCore" /><span className="eyebrow">Personal metabolic intelligence</span><h1>ZCore</h1><p>Sign in to sync your health data across all devices.</p><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength="6" required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} /></label>{message && <div className="message">{message}</div>}<button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button><button type="button" className="text-button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'Create a new account' : 'Use an existing account'}</button><div className="auth-legal">By continuing, you agree to the <Link href="/terms">Terms</Link> and acknowledge the <Link href="/privacy">Privacy Policy</Link>.</div></form></main>
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
  const metrics = useMemo(() => calculateMetrics(entries, 28), [entries])
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
    <div className="metric-grid"><Metric label="Current weight" value={latestWeight ? `${formatNumber(Number(latestWeight.weight_lb), 1)} lb` : '—'} /><Metric label="28-day average intake" value={metrics ? formatNumber(metrics.avgIntake) : '—'} /><Metric label="Estimated actual TDEE" value={metrics?.ready ? formatNumber(metrics.estimatedActual) : `${Math.max(0, 28 - (metrics?.sampleDays || 0))} days left`} /><Metric label={whoopConnected ? 'Wearable correction factor' : 'Wearable comparison'} value={whoopConnected && metrics?.ready && metrics?.correction ? metrics.correction.toFixed(3) : whoopConnected ? 'Collecting data' : 'Not connected'} /></div>
    <section className="insight-card"><div className="insight-head"><span className="feature-icon">◎</span><div><span className="eyebrow">Current analysis</span><h2>{whoopConnected ? 'Wearable accuracy' : 'Metabolic estimate'}</h2></div></div>{whoopConnected ? (!metrics?.ready ? <p>Log {Math.max(0, 28 - (metrics?.sampleDays || 0))} more complete day{Math.max(0, 28 - (metrics?.sampleDays || 0)) === 1 ? '' : 's'} containing weight and nutrition before ZCore displays a TDEE or wearable-accuracy estimate.</p> : <><p>Over the last 28 days, your connected wearable appears to be <strong>{metrics.error >= 0 ? 'overestimating' : 'underestimating'}</strong> expenditure by approximately <strong>{formatNumber(Math.abs(metrics.error))} calories per day</strong> ({formatNumber(Math.abs(metrics.errorPct), 1)}%).</p><small>This remains preliminary until you have at least 28–56 consistent days. Food logging and water-weight changes can affect the estimate.</small></>) : <><p>ZCore can estimate your changing maintenance needs from consistent weight and nutrition data. A wearable is optional and only adds another comparison point.</p><small>For useful estimates, log morning weight and complete macros consistently for at least 14–28 days.</small></>}</section>
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


function AppArea() {
  const currentLocalDate = useLocalDateKey()
  const [session, setSession] = useState(null), [loading, setLoading] = useState(true), [entries, setEntries] = useState([]), [tab, setTab] = useState('dashboard'), [editing, setEditing] = useState(emptyEntry()), [message, setMessage] = useState(''), [whoopConnected, setWhoopConnected] = useState(false), [wearableChoice, setWearableChoice] = useState(null)
  useEffect(() => { if (!isConfigured) { setLoading(false); return } supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) }); const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession)); return () => listener.subscription.unsubscribe() }, [])
  useEffect(() => { if (session) { loadEntries(); loadPreferences(); checkWhoop() } }, [session])
  async function checkWhoop() { try { const { data: { session: current } } = await supabase.auth.getSession(); const response = await fetch('/.netlify/functions/whoop-status', { headers: { authorization: `Bearer ${current?.access_token || ''}` } }); const result = await response.json(); setWhoopConnected(Boolean(result.connected)); if (result.connected) setWearableChoice('whoop') } catch { setWhoopConnected(false) } }
  async function loadPreferences() { const { data } = await supabase.from('user_preferences').select('wearable_provider').maybeSingle(); if (data) setWearableChoice(data.wearable_provider || 'none') }
  async function saveWearableChoice(choice) { setWearableChoice(choice); await supabase.from('user_preferences').upsert({ user_id: session.user.id, wearable_provider: choice }, { onConflict: 'user_id' }); setTab(choice === 'whoop' ? 'integrations' : 'entry') }
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
  return <div className="app-bg"><div className="app-shell"><header className="app-header"><Brand /><div className="app-header-actions"><Link href="/" className="text-link">Website</Link><button className="button button-secondary" onClick={() => supabase.auth.signOut()}>Sign out</button></div></header>{wearableChoice == null && <section className="onboarding-card"><span className="eyebrow">Welcome to ZCore</span><h2>Do you use a wearable?</h2><p>ZCore works fully without one. Choose WHOOP only to unlock automatic recovery, sleep, strain, and workout imports.</p><div className="choice-grid"><button className="choice-card" onClick={() => saveWearableChoice('none')}><strong>No wearable</strong><span>Weight, macros, steps, and workouts</span></button><button className="choice-card" onClick={() => saveWearableChoice('whoop')}><strong>WHOOP</strong><span>Connect automatic wearable data</span></button><button className="choice-card" onClick={() => saveWearableChoice('other')}><strong>Other wearable</strong><span>Manual entry for now; more integrations later</span></button></div></section>}<nav className="app-nav">{[['dashboard','Dashboard'],['entry','Daily log'],['history','History'],['learning','Learning Center'],['integrations','Integrations']].map(([id,label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => {
      setTab(id)
      if (id === 'entry') {
        const today = localDateKey()
        const savedToday = entries.find(item => item.entry_date === today)
        setEditing(savedToday ? { ...emptyEntry(), ...savedToday, entry_date: today } : { ...emptyEntry(), entry_date: today })
      }
    }}>{label}</button>)}</nav>{message && <div className="message">{message}</div>}{tab === 'dashboard' && <Dashboard entries={entries} whoopConnected={whoopConnected} today={currentLocalDate} />}{tab === 'entry' && <EntryForm key={editing.id || editing.entry_date} entry={editing} entries={entries} whoopConnected={whoopConnected} onSave={saveEntry} onCancel={editing.id ? () => { setEditing(emptyEntry()); setTab('history') } : null} />}{tab === 'history' && <History entries={entries} onEdit={entry => { setEditing(entry); setTab('entry') }} onDelete={deleteEntry} />}{tab === 'learning' && <AppLearningCenter />}{tab === 'integrations' && <section className="integration-stack"><div className="integration-intro"><span className="eyebrow">Optional data sources</span><h2>Integrations</h2><p>ZCore learns from Calories In, Calories Out, and changes in body weight. Wearables are optional data sources that add automatic activity, sleep, recovery, and calorie information.</p><label>Current setup<select value={wearableChoice || 'none'} onChange={e => saveWearableChoice(e.target.value)}><option value="none">No wearable</option><option value="whoop">WHOOP</option><option value="other">Other wearable (manual for now)</option></select></label></div><div className="provider-grid"><article className={`provider-card ${wearableChoice === 'whoop' ? 'selected' : ''}`}><span className="provider-status live">Available</span><h3>WHOOP</h3><p>Automatic workouts, calories, strain, recovery, heart rate, HRV, and sleep.</p></article><article className="provider-card"><span className="provider-status">Coming soon</span><h3>Garmin</h3><p>Planned support for daily summaries, steps, calories, sleep, heart rate, and activities.</p></article><article className="provider-card"><span className="provider-status">Planned</span><h3>Apple Health</h3><p>A future bridge for activity, workouts, body measurements, and supported health metrics.</p></article><article className="provider-card"><span className="provider-status">Planned</span><h3>Fitbit & Oura</h3><p>Additional wearable options are planned as ZCore's integration layer expands.</p></article></div>{wearableChoice === 'whoop' && <WhoopPanel />}{wearableChoice !== 'whoop' && <div className="integration-card"><h3>No wearable connection required</h3><p>Continue logging weight, macros, steps, and workouts. ZCore will estimate your metabolism from Calories In and observed body-weight trends.</p></div>}</section>}</div></div>
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => { const update = () => setPath(window.location.pathname); window.addEventListener('popstate', update); return () => window.removeEventListener('popstate', update) }, [])
  if (path === '/about') return <AboutPage />
  if (path === '/consistency') return <ConsistencyPage />
  if (path === '/learning') return <LearningPage />
  if (path === '/privacy') return <PrivacyPage />
  if (path === '/terms') return <TermsPage />
  if (path === '/contact') return <ContactPage />
  if (path === '/app' || path.startsWith('/app/')) return <AppArea />
  return <LandingPage />
}
