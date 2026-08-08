import { useRef, useState } from 'react'
import { caloriesFromMacros } from '../lib/analytics'
import { localTimezoneOffset, longDate } from '../lib/dates'
import { emptyEntry, entryCompletion, hasValue, nutritionComplete, workoutOptions } from '../lib/entries'
import { supabase } from '../lib/supabase'
export default function EntryForm({ entry, entries, onSave, onCancel, whoopConnected }) {
  const [form, setForm] = useState(entry)
  const [busy, setBusy] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const syncRequest = useRef(0)
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const macrosComplete = nutritionComplete(form)
  const calculatedCalories = macrosComplete ? caloriesFromMacros(form.carbs_g, form.protein_g, form.fat_g) : null
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
        next[`workout_${n}_type`] = workout?.sport_name || baseForm[`workout_${n}_type`] || 'None'
        next[`workout_${n}_minutes`] = workout?.duration_minutes ?? baseForm[`workout_${n}_minutes`] ?? ''
        next[`workout_${n}_whoop_calories`] = workout?.calories ?? baseForm[`workout_${n}_whoop_calories`] ?? ''
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

function Metric({ label, value }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div> }
