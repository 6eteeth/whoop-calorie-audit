import { lazy, Suspense, useEffect, useState } from 'react'

const AppArea = lazy(() => import('./components/AppArea'))

const CONTACT_EMAIL = 'support@zcore.health'
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


export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => { const update = () => setPath(window.location.pathname); window.addEventListener('popstate', update); return () => window.removeEventListener('popstate', update) }, [])
  if (path === '/about') return <AboutPage />
  if (path === '/consistency') return <ConsistencyPage />
  if (path === '/learning') return <LearningPage />
  if (path === '/privacy') return <PrivacyPage />
  if (path === '/terms') return <TermsPage />
  if (path === '/contact') return <ContactPage />
  if (path === '/app' || path.startsWith('/app/')) return <Suspense fallback={<main className="auth-page"><div className="auth-card"><p>Loading ZCore…</p></div></main>}><AppArea /></Suspense>
  return <LandingPage />
}
