import { useMemo, useState } from 'react'
import { totalWorkoutCalories } from '../lib/analytics'
import { dateLabel, localDateKey, longDate, shiftLocalDate } from '../lib/dates'
import { entryCompletion, hasValue, workoutComplete } from '../lib/entries'
import { downloadHistoryCsv } from '../lib/historyExport'

function sundayStart(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`)
  return shiftLocalDate(dateKey, -date.getDay())
}

function average(entries, selector) {
  const values = entries.map(selector).filter(hasValue).map(Number).filter(Number.isFinite)
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function weeklySummaries(entries) {
  const byDate = new Map()
  entries.forEach(entry => byDate.set(entry.entry_date, entry))

  const weeks = new Map()
  byDate.forEach((entry, dateKey) => {
    const start = sundayStart(dateKey)
    if (!weeks.has(start)) weeks.set(start, [])
    weeks.get(start).push(entry)
  })

  const summaries = [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([start, weekEntries]) => {
      const end = shiftLocalDate(start, 6)
      const complete = Array.from({ length: 7 }, (_, index) => shiftLocalDate(start, index)).every(day => byDate.has(day))
      const weights = weekEntries.map(entry => entry.weight_lb).filter(hasValue).map(Number).filter(Number.isFinite)
      const avgCalories = average(weekEntries, entry => entry.calories_eaten)
      const avgWeight = weights.length ? weights.reduce((sum, value) => sum + value, 0) / weights.length : null
      return {
        start,
        end,
        complete,
        averageProtein: average(weekEntries, entry => entry.protein_g),
        averageCarbs: average(weekEntries, entry => entry.carbs_g),
        averageFat: average(weekEntries, entry => entry.fat_g),
        averageCalories: avgCalories,
        highWeight: weights.length ? Math.max(...weights) : null,
        lowWeight: weights.length ? Math.min(...weights) : null,
        averageWeight: avgWeight,
        goldenRatio: avgCalories != null && avgWeight ? avgCalories / avgWeight : null,
        averageSteps: average(weekEntries, entry => entry.steps),
      }
    })

  return summaries
    .map((week, index) => {
      const previous = summaries[index - 1]
      const isPreviousCalendarWeek = previous && previous.start === shiftLocalDate(week.start, -7)
      const highWeightChange = isPreviousCalendarWeek && hasValue(previous.highWeight) && hasValue(week.highWeight)
        ? week.highWeight - previous.highWeight
        : null
      return { ...week, highWeightChange }
    })
    .filter(week => week.complete)
}

function formatAverage(value, digits = 0) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function WeeklyHistory({ entries }) {
  const weeks = useMemo(() => weeklySummaries(entries), [entries])

  if (!weeks.length) {
    return <div className="empty-state">A complete Sunday–Saturday week is needed before weekly history appears.</div>
  }

  return <div className="table-wrap weekly-history-wrap"><table><thead><tr><th>Week</th><th>Dates</th><th>Avg Protein</th><th>Avg Carbs</th><th>Avg Fat</th><th>Avg Calories</th><th>High Weight</th><th>Low Weight</th><th>Avg Weight</th><th>High Weight Change</th><th>Golden Ratio</th><th>Avg Steps</th></tr></thead><tbody>{[...weeks].reverse().map((week, reverseIndex) => {
    const weekNumber = weeks.length - reverseIndex
    return <tr key={week.start}><td>{weekNumber}</td><td>{dateLabel(week.start)} – {dateLabel(week.end)}</td><td>{formatAverage(week.averageProtein)}</td><td>{formatAverage(week.averageCarbs)}</td><td>{formatAverage(week.averageFat)}</td><td>{formatAverage(week.averageCalories)}</td><td>{week.highWeight == null ? '—' : `${formatAverage(week.highWeight, 1)} lb`}</td><td>{week.lowWeight == null ? '—' : `${formatAverage(week.lowWeight, 1)} lb`}</td><td>{week.averageWeight == null ? '—' : `${formatAverage(week.averageWeight, 2)} lb`}</td><td>{week.highWeightChange == null ? '—' : `${formatAverage(week.highWeightChange, 1)} lb`}</td><td>{formatAverage(week.goldenRatio, 2)}</td><td>{formatAverage(week.averageSteps)}</td></tr>
  })}</tbody></table></div>
}

function DailyHistory({ entries, onEdit, onDelete }) {
  return <div className="table-wrap"><table><thead><tr><th>Date</th><th>Status</th><th>Weight</th><th>Calories</th><th>Carbs</th><th>Fat</th><th>Protein</th><th>Wearable total</th><th>Steps</th><th>Workout calories</th><th>Recovery</th><th>Sleep</th><th></th></tr></thead><tbody>{[...entries].reverse().map(entry => { const status = entryCompletion(entry); const hasWearableData = [entry.whoop_calories_burned, entry.whoop_day_strain, entry.whoop_recovery_score, entry.whoop_resting_heart_rate, entry.whoop_hrv_rmssd_milli, entry.whoop_sleep_duration_minutes].some(hasValue); const completed = [status.weight, status.nutrition, status.workouts, ...(hasWearableData ? [status.whoop] : [])].filter(Boolean).length; const total = hasWearableData ? 4 : 3; return <tr key={entry.id}><td><button className="link-button" onClick={() => onEdit(entry)}>{longDate(entry.entry_date)}</button></td><td><span className="completion-badge">{completed}/{total}</span></td><td>{hasValue(entry.weight_lb) ? `${entry.weight_lb} lb` : '—'}</td><td>{hasValue(entry.calories_eaten) ? entry.calories_eaten : '—'}</td><td>{entry.carbs_g ?? '—'}</td><td>{entry.fat_g ?? '—'}</td><td>{entry.protein_g ?? '—'}</td><td>{hasValue(entry.whoop_calories_burned) ? entry.whoop_calories_burned : '—'}</td><td>{hasValue(entry.steps) ? Number(entry.steps).toLocaleString() : '—'}</td><td>{workoutComplete(entry) ? totalWorkoutCalories(entry) : '—'}</td><td>{entry.whoop_recovery_score == null ? '—' : `${entry.whoop_recovery_score}%`}</td><td>{entry.whoop_sleep_duration_minutes == null ? '—' : `${(Number(entry.whoop_sleep_duration_minutes)/60).toFixed(1)} hr`}</td><td><button className="danger" onClick={() => onDelete(entry)}>Delete</button></td></tr>})}</tbody></table></div>
}

export default function History({ entries, onEdit, onDelete }) {
  const [view, setView] = useState('daily')

  return <section className="table-card history-table"><style>{`@page{size:landscape;margin:.3in}@media print{body{background:#fff!important}.app-shell{max-width:none!important;padding:0!important}.app-header,.app-nav{display:none!important}.history-table{border:0!important;box-shadow:none!important;border-radius:0!important;padding:0!important;margin:0!important;width:100%!important}.history-table .section-heading{margin-bottom:8px}.history-table .section-heading .button,.history-tabs{display:none!important}.history-table .table-wrap{overflow:visible!important}.history-table table{width:100%!important;font-size:8px!important;table-layout:auto!important}.history-table th,.history-table td{padding:4px 3px!important;white-space:normal!important;line-height:1.15!important}.history-table th{font-size:7.5px!important}.history-table .link-button{color:#000!important;font-weight:700!important}.history-table tr{break-inside:avoid!important}.history-table thead{display:table-header-group!important}.history-table.daily-view th:last-child,.history-table.daily-view td:last-child{display:none!important}}.history-tabs{display:flex;gap:8px;margin:0 0 18px}.history-tab{min-width:92px}.history-tab.active{background:var(--accent,#e6007e);color:#fff;border-color:var(--accent,#e6007e)}.weekly-history-wrap td,.weekly-history-wrap th{white-space:nowrap}.weekly-history-wrap td:first-child,.weekly-history-wrap th:first-child{text-align:center}`}</style><div className="section-heading"><div><span className="eyebrow">Your records</span><h2>History</h2></div>{view === 'daily' && <button className="button button-secondary" disabled={!entries.length} onClick={() => downloadHistoryCsv(entries, localDateKey())}>Export CSV</button>}</div><div className="history-tabs" role="tablist" aria-label="History view"><button className={`button history-tab ${view === 'daily' ? 'active' : 'button-secondary'}`} role="tab" aria-selected={view === 'daily'} onClick={() => setView('daily')}>Daily</button><button className={`button history-tab ${view === 'weekly' ? 'active' : 'button-secondary'}`} role="tab" aria-selected={view === 'weekly'} onClick={() => setView('weekly')}>Weekly</button></div><div className={view === 'daily' ? 'daily-view' : 'weekly-view'}>{view === 'daily' ? <DailyHistory entries={entries} onEdit={onEdit} onDelete={onDelete} /> : <WeeklyHistory entries={entries} />}</div></section>
}
