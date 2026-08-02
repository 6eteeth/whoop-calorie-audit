import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
import { Chart, registerables } from 'https://cdn.jsdelivr.net/npm/chart.js@4/+esm'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js'

Chart.register(...registerables)

const configured = !SUPABASE_URL.includes('YOUR_PROJECT') && !SUPABASE_PUBLISHABLE_KEY.includes('YOUR_')
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null
const app = document.querySelector('#app')
let session = null
let entries = []
let currentTab = 'dashboard'
let charts = []

const today = new Date().toISOString().slice(0, 10)
const emptyEntry = () => ({ entry_date: today, weight_lb: '', calories_eaten: '', whoop_calories_burned: '', protein_g: '', steps: '', workout_1_type: 'None', workout_1_minutes: '', workout_1_whoop_calories: '', workout_2_type: 'None', workout_2_minutes: '', workout_2_whoop_calories: '', workout_3_type: 'None', workout_3_minutes: '', workout_3_whoop_calories: '', notes: '' })
let editing = emptyEntry()

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))
}
function num(value) { const n = Number(value); return Number.isFinite(n) ? n : null }
function avg(rows, key) { const values = rows.map(x => num(x[key])).filter(x => x !== null); return values.length ? values.reduce((a,b)=>a+b,0)/values.length : null }
function fmt(value, suffix = '') { return Number.isFinite(value) ? `${Math.round(value).toLocaleString()}${suffix}` : '—' }
function dateLabel(value) { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month:'short', day:'numeric' }) }
function longDate(value) { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }) }

function metrics(days = 28) {
  if (!entries.length) return null
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days + 1); cutoff.setHours(0,0,0,0)
  const rows = entries.filter(e => new Date(`${e.entry_date}T00:00:00`) >= cutoff)
  if (rows.length < 2) return { sampleDays: rows.length }
  const first = rows[0], last = rows.at(-1)
  const elapsed = Math.max(1, Math.round((new Date(last.entry_date) - new Date(first.entry_date)) / 86400000))
  const weightChange = num(last.weight_lb) - num(first.weight_lb)
  const avgIntake = avg(rows, 'calories_eaten')
  const avgWhoop = avg(rows, 'whoop_calories_burned')
  const estimatedActual = avgIntake - ((weightChange * 3500) / elapsed)
  const error = avgWhoop - estimatedActual
  return { sampleDays: rows.length, avgIntake, avgWhoop, estimatedActual, error, errorPct: estimatedActual ? error / estimatedActual * 100 : null, correction: avgWhoop ? estimatedActual / avgWhoop : null }
}

function destroyCharts() { charts.forEach(c => c.destroy()); charts = [] }
function shell(content) {
  destroyCharts()
  app.innerHTML = `<div class="app-shell">
    <header><div><span class="eyebrow">Personal energy dashboard</span><h1>WHOOP Calorie Audit</h1></div><button id="signout" class="icon-button" title="Sign out">Sign out</button></header>
    <nav>${[['dashboard','Dashboard'],['entry','Daily entry'],['history','History']].map(([id,label]) => `<button data-tab="${id}" class="${currentTab===id?'active':''}">${label}</button>`).join('')}</nav>
    <div id="message"></div>${content}</div>`
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { currentTab = b.dataset.tab; render() })
  document.querySelector('#signout').onclick = () => supabase.auth.signOut()
}
function showMessage(text, error = false) { const box = document.querySelector('#message'); if (box) box.innerHTML = text ? `<div class="message ${error?'error':''}">${esc(text)}</div>` : '' }

function setupScreen() {
  app.innerHTML = `<main class="auth-page"><section class="auth-card"><span class="eyebrow">One-time setup needed</span><h1>Connect Supabase</h1><p>Open <code>config.js</code> and replace the two placeholder values with your Supabase project URL and publishable key. Then deploy this folder to Netlify, Vercel, or another static host.</p><p>The included <code>README.md</code> and <code>supabase-schema.sql</code> contain the complete instructions.</p></section></main>`
}
function authScreen() {
  app.innerHTML = `<main class="auth-page"><form class="auth-card" id="auth-form"><span class="eyebrow">Private cloud account</span><h1>WHOOP Calorie Audit</h1><p>Sign in to sync entries across your phone, tablet and computers.</p><label>Email<input id="email" type="email" required></label><label>Password<input id="password" type="password" minlength="6" required></label><div id="message"></div><button class="primary" id="auth-submit">Sign in</button><button type="button" class="text-button" id="auth-switch">Create a new account</button></form></main>`
  let mode = 'signin'
  document.querySelector('#auth-switch').onclick = () => {
    mode = mode === 'signin' ? 'signup' : 'signin'
    document.querySelector('#auth-submit').textContent = mode === 'signin' ? 'Sign in' : 'Create account'
    document.querySelector('#auth-switch').textContent = mode === 'signin' ? 'Create a new account' : 'Use an existing account'
  }
  document.querySelector('#auth-form').onsubmit = async e => {
    e.preventDefault(); showMessage('')
    const credentials = { email: document.querySelector('#email').value, password: document.querySelector('#password').value }
    const result = mode === 'signin' ? await supabase.auth.signInWithPassword(credentials) : await supabase.auth.signUp(credentials)
    if (result.error) showMessage(result.error.message, true)
    else if (mode === 'signup' && !result.data.session) showMessage('Account created. Check your email to confirm it, then sign in.')
  }
}
async function loadEntries() {
  const { data, error } = await supabase.from('daily_entries').select('*').order('entry_date', { ascending: true })
  if (error) throw error
  entries = data || []
}

function dashboard() {
  const m = metrics(), latest = entries.length ? num(entries.at(-1).weight_lb) : null
  shell(`<main>
    <section class="metric-grid">
      ${metric('Latest weight', latest ? `${latest.toFixed(1)} lb` : '—')}
      ${metric('28-day WHOOP avg', fmt(m?.avgWhoop,' cal'))}
      ${metric('Estimated actual TDEE', fmt(m?.estimatedActual,' cal'))}
      ${metric('WHOOP correction', m?.correction ? `× ${m.correction.toFixed(3)}` : '—')}
    </section>
    <section class="insight-card"><h2>Current accuracy estimate</h2>${!m || m.sampleDays < 14 ? `<p>Log at least 14 days for a preliminary estimate. A 28–56 day history will be more useful.</p>` : `<p>WHOOP appears to <strong>${m.error >= 0 ? 'overestimate' : 'underestimate'}</strong> expenditure by <strong>${Math.abs(m.error).toFixed(0)} calories/day</strong> (${Math.abs(m.errorPct).toFixed(1)}%). A working personal adjustment is <strong>× ${m.correction.toFixed(3)}</strong>.</p>`}<small>This estimate is affected by food-logging accuracy, water shifts, glycogen, sodium and the 3,500-calorie-per-pound approximation.</small></section>
    <section class="chart-card"><h2>Weight trend</h2><div class="chart-wrap"><canvas id="weight-chart"></canvas></div></section>
    <section class="chart-card"><h2>Calories eaten vs. WHOOP expenditure</h2><div class="chart-wrap"><canvas id="calorie-chart"></canvas></div></section>
  </main>`)
  renderCharts()
}
function metric(label, value) { return `<div class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>` }
function movingAverage(values, n=7) { return values.map((_,i) => { const s = values.slice(Math.max(0,i-n+1),i+1).filter(Number.isFinite); return s.length ? s.reduce((a,b)=>a+b,0)/s.length : null }) }
function renderCharts() {
  const labels = entries.map(e => dateLabel(e.entry_date)), weights = entries.map(e => num(e.weight_lb))
  charts.push(new Chart(document.querySelector('#weight-chart'), { type:'line', data:{ labels, datasets:[{label:'Daily weight',data:weights,tension:.25,pointRadius:2},{label:'7-day average',data:movingAverage(weights),tension:.25,pointRadius:0,borderWidth:3}]}, options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false}} }))
  charts.push(new Chart(document.querySelector('#calorie-chart'), { type:'bar', data:{ labels, datasets:[{label:'Calories eaten',data:entries.map(e=>num(e.calories_eaten))},{label:'WHOOP burned',data:entries.map(e=>num(e.whoop_calories_burned))}]}, options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false}} }))
}
function entryScreen() {
  shell(`<main><form class="entry-card" id="entry-form"><div><span class="eyebrow">Daily check-in</span><h2>Add or update an entry</h2><p>Saving the same date replaces that day's previous entry.</p></div><div class="form-grid">
    ${field('Date','entry_date','date',true)}${field('Morning weight (lb)','weight_lb','number',true,'0.1')}${field('Calories eaten','calories_eaten','number',true)}${field('WHOOP calories burned','whoop_calories_burned','number',true)}${field('Protein (g)','protein_g','number')}${field('Steps','steps','number')}
    ${workoutFields(1)}${workoutFields(2)}${workoutFields(3)}
    <label class="full">Notes<textarea name="notes" rows="3" placeholder="High-sodium meal, travel, illness, unusual soreness…">${esc(editing.notes)}</textarea></label>
  </div><button class="primary">Save daily entry</button></form></main>`)
  document.querySelector('#entry-form').onsubmit = saveEntry
}
function field(label,name,type,required=false,step='1') { return `<label>${label}<input name="${name}" type="${type}" ${type==='number'?`step="${step}" min="0"`:''} value="${esc(editing[name])}" ${required?'required':''}></label>` }
function workoutFields(number) {
  const typeKey = `workout_${number}_type`, minutesKey = `workout_${number}_minutes`, caloriesKey = `workout_${number}_whoop_calories`
  const types = ['None','Weights','Cardio','Weights + cardio','Sports','Other']
  return `<div class="workout-heading full"><h3>Workout ${number}</h3></div><label>Workout ${number} type<select name="${typeKey}">${types.map(x=>`<option ${editing[typeKey]===x?'selected':''}>${x}</option>`).join('')}</select></label>${field(`Workout ${number} minutes`,minutesKey,'number')}${field(`Workout ${number} WHOOP workout calories`,caloriesKey,'number')}`
}
async function saveEntry(e) {
  e.preventDefault(); showMessage('')
  const data = Object.fromEntries(new FormData(e.currentTarget))
  const payload = { user_id: session.user.id, entry_date:data.entry_date, weight_lb:Number(data.weight_lb), calories_eaten:Number(data.calories_eaten), whoop_calories_burned:Number(data.whoop_calories_burned), protein_g:data.protein_g?Number(data.protein_g):null, steps:data.steps?Number(data.steps):null, workout_1_type:data.workout_1_type, workout_1_minutes:data.workout_1_minutes?Number(data.workout_1_minutes):null, workout_1_whoop_calories:data.workout_1_whoop_calories?Number(data.workout_1_whoop_calories):null, workout_2_type:data.workout_2_type, workout_2_minutes:data.workout_2_minutes?Number(data.workout_2_minutes):null, workout_2_whoop_calories:data.workout_2_whoop_calories?Number(data.workout_2_whoop_calories):null, workout_3_type:data.workout_3_type, workout_3_minutes:data.workout_3_minutes?Number(data.workout_3_minutes):null, workout_3_whoop_calories:data.workout_3_whoop_calories?Number(data.workout_3_whoop_calories):null, notes:data.notes.trim()||null }
  const { error } = await supabase.from('daily_entries').upsert(payload, { onConflict:'user_id,entry_date' })
  if (error) return showMessage(error.message,true)
  editing = emptyEntry(); await loadEntries(); currentTab='dashboard'; render(); showMessage('Entry saved.')
}
function workoutCaloriesTotal(entry) { return [1,2,3].reduce((sum,n) => sum + (num(entry[`workout_${n}_whoop_calories`]) || 0), 0) }
function historyScreen() {
  shell(`<main><section class="table-card"><h2>Entry history</h2><div class="table-wrap"><table><thead><tr><th>Date</th><th>Weight</th><th>Eaten</th><th>WHOOP total</th><th>WHOOP workout</th><th>Protein</th><th>Steps</th><th></th></tr></thead><tbody>${[...entries].reverse().map(e=>`<tr data-edit="${e.id}"><td>${longDate(e.entry_date)}</td><td>${e.weight_lb}</td><td>${e.calories_eaten}</td><td>${e.whoop_calories_burned}</td><td>${workoutCaloriesTotal(e) || '—'}</td><td>${e.protein_g??'—'}</td><td>${e.steps?Number(e.steps).toLocaleString():'—'}</td><td><button class="danger" data-delete="${e.id}">Delete</button></td></tr>`).join('')}</tbody></table></div></section></main>`)
  document.querySelectorAll('[data-edit]').forEach(row => row.onclick = () => { editing = {...entries.find(e=>String(e.id)===row.dataset.edit)}; currentTab='entry'; render() })
  document.querySelectorAll('[data-delete]').forEach(button => button.onclick = async e => { e.stopPropagation(); const {error}=await supabase.from('daily_entries').delete().eq('id',button.dataset.delete); if(error)showMessage(error.message,true); else {await loadEntries();render()} })
}
function render() { if (currentTab==='dashboard') dashboard(); else if(currentTab==='entry') entryScreen(); else historyScreen() }

if (!configured) setupScreen()
else {
  const { data } = await supabase.auth.getSession(); session = data.session
  supabase.auth.onAuthStateChange(async (_event,next) => { session=next; if(session){ try{await loadEntries();render()}catch(e){app.innerHTML=`<main class="center-card">${esc(e.message)}</main>`} } else authScreen() })
  if (session) { try { await loadEntries(); render() } catch(e) { app.innerHTML=`<main class="center-card">${esc(e.message)}</main>` } } else authScreen()
}
