import { useMemo } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { calculateMetrics, weeklyWeightAverages } from '../lib/analytics'
import { dateLabel, shiftLocalDate } from '../lib/dates'
import { emptyEntry, formatNumber, hasValue, nutritionComplete, whoopComplete } from '../lib/entries'
export default function Dashboard({ entries, whoopConnected, today }) {
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
export function Metric({ label, value }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div> }
