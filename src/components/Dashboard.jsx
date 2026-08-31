import { useMemo } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { calculateTdeeModels, weeklyWeightAverages } from '../lib/analytics'
import { dateLabel, shiftLocalDate } from '../lib/dates'
import { emptyEntry, formatNumber, hasValue, nutritionComplete, whoopComplete } from '../lib/entries'
export default function Dashboard({ entries, whoopConnected, today }) {
  const models = useMemo(() => calculateTdeeModels(entries, 5), [entries])
  const metrics = models.thirtyDay
  const longTermMetrics = models.allTime
  const weightRows = entries.filter(e => hasValue(e.weight_lb)).slice(-30)
  const calorieRows = entries.filter(e => hasValue(e.calories_eaten) || hasValue(e.whoop_calories_burned)).slice(-30)
  const stepRows = entries.filter(e => hasValue(e.steps)).slice(-30)
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
  const stepData = { labels: stepRows.map(e => dateLabel(e.entry_date)), datasets: [{ label: 'Steps', data: stepRows.map(e => Number(e.steps)), backgroundColor: 'rgba(255,20,147,.72)', borderRadius: 5 }] }
  const weeklyWeightData = { labels: weeklyWeights.map(item => `Week of ${dateLabel(item.week)}`), datasets: [{ label: 'Average weight', data: weeklyWeights.map(item => Number(item.average.toFixed(2))), tension: 0.28, borderColor: '#111827', backgroundColor: 'rgba(17,24,39,.1)', pointRadius: 4 }] }
  return <>
    <section className="task-card"><div><span className="eyebrow">Daily workflow</span><h2>Today's tasks</h2></div><div className="task-list">{tasks.map(task => <div className={`task-item ${task.done ? 'done' : ''}`} key={task.label}><span>{task.done ? '✓' : '○'}</span><strong>{task.label}</strong></div>)}</div></section>
    <div className="metric-grid"><Metric label="Current weight" value={latestWeight ? `${formatNumber(Number(latestWeight.weight_lb), 1)} lb` : '—'} /><Metric label="30-day average intake" value={metrics ? formatNumber(metrics.avgIntake) : '—'} /><Metric label="30-day estimated TDEE" value={metrics?.ready ? formatNumber(metrics.estimatedActual) : `${Math.max(0, (metrics?.requiredDays || 14) - (metrics?.sampleDays || 0))} days left`} /><Metric label="All-data estimated TDEE" value={longTermMetrics?.ready ? formatNumber(longTermMetrics.estimatedActual) : 'Collecting data'} /></div>
    <section className="insight-card"><div className="insight-head"><span className="feature-icon">◎</span><div><span className="eyebrow">Current analysis</span><h2>{whoopConnected ? 'Wearable accuracy' : 'Metabolic estimate'}</h2></div></div>{!metrics?.ready ? <p>Keep logging complete weight and nutrition days. ZCore withholds the newest 5 days so calorie changes have time to appear in the weight trend before estimating expenditure.</p> : <>{whoopConnected ? <p>Using the matured 30-day window, your connected wearable appears to be <strong>{metrics.error >= 0 ? 'overestimating' : 'underestimating'}</strong> expenditure by approximately <strong>{formatNumber(Math.abs(metrics.error))} calories per day</strong> ({formatNumber(Math.abs(metrics.errorPct), 1)}%).</p> : <p>Your 30-day estimate responds to recent metabolic changes while the all-data estimate provides a more stable long-term anchor.</p>}<small>TDEE calculations use a 5-day calorie delay and a smoothed weight trend to reduce distortion from recent intake, glycogen, water and day-to-day scale noise.</small></>}</section>
    <section className="chart-card weekly-chart-card"><div className="chart-title-row"><div><span className="eyebrow">Sunday through Saturday</span><h2>Weekly average weight</h2></div><small>Missing days are skipped rather than treated as zero.</small></div><div className="chart-wrap chart-wrap-tall"><Line data={weeklyWeightData} options={{ responsive: true, maintainAspectRatio: false, spanGaps: true }} /></div></section><section className="chart-grid"><div className="chart-card"><h2>Daily weight</h2><div className="chart-wrap"><Line data={weightData} options={{ responsive: true, maintainAspectRatio: false, spanGaps: true }} /></div></div><div className="chart-card"><h2>{whoopConnected ? 'Intake vs. wearable' : 'Daily calorie intake'}</h2><div className="chart-wrap"><Bar data={calorieData} options={{ responsive: true, maintainAspectRatio: false }} /></div></div></section>
    <section className="chart-card"><div className="chart-title-row"><div><span className="eyebrow">Last 30 logged days</span><h2>Step count history</h2></div><small>Days without a step count are skipped.</small></div><div className="chart-wrap chart-wrap-tall"><Bar data={stepData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} /></div></section>
  </>
}
export function Metric({ label, value }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div> }
