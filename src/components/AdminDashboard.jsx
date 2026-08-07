import { useEffect, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { formatNumber } from '../lib/entries'
import { supabase } from '../lib/supabase'
import { Metric } from './Dashboard'
export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch('/.netlify/functions/admin-overview', { headers: { authorization: `Bearer ${session?.access_token || ''}` } })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error || `Admin request failed (${response.status})`)
        if (active) setData(result)
      } catch (e) { if (active) setError(e.message) }
      finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [])

  if (loading) return <section className="admin-panel"><p>Loading admin analytics…</p></section>
  if (error) return <section className="admin-panel"><div className="message">{error}</div></section>
  const users = (data?.users || []).filter(user => {
    const haystack = `${user.first_name || ''} ${user.last_name || ''} ${user.email || ''}`.toLowerCase()
    const matchesQuery = haystack.includes(query.toLowerCase())
    const matchesFilter = filter === 'all' || (filter === 'wearable' && user.wearable_connected) || (filter === 'active7' && user.active_last_7_days) || (filter === 'inactive30' && !user.active_last_30_days)
    return matchesQuery && matchesFilter
  })
  const trendData = { labels: (data?.trends?.monthly_signups || []).map(x => x.month), datasets: [{ label: 'New users', data: (data?.trends?.monthly_signups || []).map(x => x.count), borderColor: '#ff1493', backgroundColor: 'rgba(255,20,147,.12)', tension: .3 }] }
  const activityData = { labels: (data?.trends?.daily_active_users || []).map(x => x.date), datasets: [{ label: 'Daily active users', data: (data?.trends?.daily_active_users || []).map(x => x.count), backgroundColor: 'rgba(17,24,39,.82)' }] }
  return <section className="admin-panel">
    <div className="admin-heading"><div><span className="eyebrow">Private administration</span><h2>Admin analytics</h2><p>Account and aggregate usage information only. Individual health details are not displayed.</p></div><span className="admin-badge">Admin only</span></div>
    <div className="admin-metrics">
      <Metric label="Total users" value={formatNumber(data.summary.total_users)} />
      <Metric label="Active today" value={formatNumber(data.summary.daily_active_users)} />
      <Metric label="Active this week" value={formatNumber(data.summary.weekly_active_users)} />
      <Metric label="Active this month" value={formatNumber(data.summary.monthly_active_users)} />
      <Metric label="New this month" value={formatNumber(data.summary.new_users_this_month)} />
      <Metric label="Wearables connected" value={formatNumber(data.summary.wearables_connected)} />
      <Metric label="Average logging streak" value={`${formatNumber(data.summary.average_logging_streak, 1)} days`} />
      <Metric label="Average logged days" value={formatNumber(data.summary.average_logged_days, 1)} />
      <Metric label="14-day TDEE ready" value={formatNumber(data.summary.users_with_tdee_ready)} />
      <Metric label="Average calculated TDEE" value={data.summary.average_calculated_tdee ? `${formatNumber(data.summary.average_calculated_tdee)} kcal` : '—'} />
      <Metric label="Average weight change" value={data.summary.average_weight_change_lb == null ? '—' : `${formatNumber(data.summary.average_weight_change_lb, 1)} lb`} />
      <Metric label="Total daily logs" value={formatNumber(data.summary.total_daily_logs)} />
    </div>
    <div className="admin-chart-grid"><div className="chart-card"><h3>New users by month</h3><div className="chart-wrap"><Line data={trendData} options={{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } } } }} /></div></div><div className="chart-card"><h3>Daily active users</h3><div className="chart-wrap"><Bar data={activityData} options={{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } } } }} /></div></div></div>
    <div className="admin-breakdowns"><article><h3>Wearable adoption</h3>{(data.breakdowns.wearables || []).map(item => <div className="breakdown-row" key={item.provider}><span>{item.provider}</span><strong>{item.count}</strong></div>)}</article><article><h3>Popular workout types</h3>{(data.breakdowns.workout_types || []).map(item => <div className="breakdown-row" key={item.type}><span>{item.type}</span><strong>{item.count}</strong></div>)}</article><article><h3>Data quality context</h3><div className="breakdown-row"><span>AI-estimated days</span><strong>{data.breakdowns.ai_estimated_days}</strong></div><div className="breakdown-row"><span>Alcohol days</span><strong>{data.breakdowns.alcohol_days}</strong></div><div className="breakdown-row"><span>Late-caffeine days</span><strong>{data.breakdowns.late_caffeine_days}</strong></div></article></div>
    <section className="table-card admin-users"><div className="section-heading"><div><span className="eyebrow">User directory</span><h2>Users</h2></div><div className="admin-controls"><input placeholder="Search name or email" value={query} onChange={e => setQuery(e.target.value)} /><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All users</option><option value="wearable">Wearable connected</option><option value="active7">Active this week</option><option value="inactive30">Inactive 30+ days</option></select></div></div><div className="table-wrap"><table><thead><tr><th>First name</th><th>Last name</th><th>Email</th><th>Joined</th><th>Last login</th><th>Wearable</th><th>Last sync</th><th>Logs</th><th>Streak</th></tr></thead><tbody>{users.map(user => <tr key={user.id}><td>{user.first_name || 'Not provided'}</td><td>{user.last_name || 'Not provided'}</td><td>{user.email}</td><td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td><td>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}</td><td>{user.wearable_connected ? user.wearable_provider : 'None'}</td><td>{user.last_wearable_sync ? new Date(user.last_wearable_sync).toLocaleString() : '—'}</td><td>{user.daily_entries}</td><td>{user.logging_streak}</td></tr>)}</tbody></table></div></section>
  </section>
}
