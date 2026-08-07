import { Bar } from 'react-chartjs-2'
import { dailyActivity } from '../lib/analytics'

const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export default function ActivityChart({ entries }) {
  const rows = entries.slice(-30).map(entry => ({ ...entry, activity: dailyActivity(entry) }))
  const data = {
    labels: rows.map(entry => dateLabel(entry.entry_date)),
    datasets: [
      { label: 'Steps', data: rows.map(entry => entry.activity.steps), backgroundColor: 'rgba(17,24,39,.78)', yAxisID: 'steps' },
      { type: 'line', label: 'Exercise minutes', data: rows.map(entry => entry.activity.exerciseMinutes), borderColor: '#ff1493', backgroundColor: 'rgba(255,20,147,.12)', tension: 0.3, pointRadius: 3, spanGaps: false, yAxisID: 'minutes' },
    ],
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      steps: { beginAtZero: true, position: 'left', title: { display: true, text: 'Steps' } },
      minutes: { beginAtZero: true, position: 'right', title: { display: true, text: 'Exercise minutes' }, grid: { drawOnChartArea: false } },
    },
  }

  return <section className="chart-card weekly-chart-card"><div className="chart-title-row"><div><span className="eyebrow">Last 30 logged days</span><h2>Daily activity</h2></div><small>Logged zero-step days count as zero. Days without exercise minutes remain unplotted.</small></div><div className="chart-wrap chart-wrap-tall"><Bar data={data} options={options} /></div></section>
}
