export const historyExportColumns = [
  ['entry_date', 'Date'],
  ['weight_lb', 'Weight (lb)'],
  ['calories_eaten', 'Calories eaten'],
  ['carbs_g', 'Carbs (g)'],
  ['fat_g', 'Fat (g)'],
  ['protein_g', 'Protein (g)'],
  ['steps', 'Steps'],
  ['workout_1_type', 'Workout 1 type'], ['workout_1_minutes', 'Workout 1 minutes'], ['workout_1_calories', 'Workout 1 calories'], ['workout_1_whoop_calories', 'Workout 1 WHOOP calories'],
  ['workout_2_type', 'Workout 2 type'], ['workout_2_minutes', 'Workout 2 minutes'], ['workout_2_calories', 'Workout 2 calories'], ['workout_2_whoop_calories', 'Workout 2 WHOOP calories'],
  ['workout_3_type', 'Workout 3 type'], ['workout_3_minutes', 'Workout 3 minutes'], ['workout_3_calories', 'Workout 3 calories'], ['workout_3_whoop_calories', 'Workout 3 WHOOP calories'],
  ['used_ai_calorie_estimate', 'Used AI calorie estimate'],
  ['caffeine_after_3pm', 'Caffeine after 3pm'],
  ['alcohol_consumed', 'Alcohol consumed'],
  ['notes', 'Notes'],
  ['whoop_calories_burned', 'WHOOP calories burned'],
  ['whoop_day_strain', 'WHOOP day strain'],
  ['whoop_average_heart_rate', 'WHOOP average heart rate'],
  ['whoop_max_heart_rate', 'WHOOP max heart rate'],
  ['whoop_recovery_score', 'WHOOP recovery score (%)'],
  ['whoop_resting_heart_rate', 'WHOOP resting heart rate'],
  ['whoop_hrv_rmssd_milli', 'WHOOP HRV RMSSD (ms)'],
  ['whoop_spo2_percentage', 'WHOOP SpO2 (%)'],
  ['whoop_skin_temp_celsius', 'WHOOP skin temperature (C)'],
  ['whoop_sleep_duration_minutes', 'WHOOP sleep duration (minutes)'],
  ['whoop_time_in_bed_minutes', 'WHOOP time in bed (minutes)'],
  ['whoop_awake_minutes', 'WHOOP awake (minutes)'],
  ['whoop_light_sleep_minutes', 'WHOOP light sleep (minutes)'],
  ['whoop_slow_wave_sleep_minutes', 'WHOOP slow wave sleep (minutes)'],
  ['whoop_rem_sleep_minutes', 'WHOOP REM sleep (minutes)'],
  ['whoop_sleep_performance_percentage', 'WHOOP sleep performance (%)'],
  ['whoop_sleep_efficiency_percentage', 'WHOOP sleep efficiency (%)'],
  ['whoop_sleep_consistency_percentage', 'WHOOP sleep consistency (%)'],
  ['whoop_respiratory_rate', 'WHOOP respiratory rate'],
  ['whoop_disturbance_count', 'WHOOP disturbance count'],
  ['whoop_sleep_cycle_count', 'WHOOP sleep cycle count'],
  ['whoop_sleep_needed_minutes', 'WHOOP sleep needed (minutes)'],
  ['whoop_synced_at', 'WHOOP synced at'],
]

const csvCell = value => {
  if (value == null) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function historyCsv(entries) {
  const rows = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date))
  return [
    historyExportColumns.map(([, label]) => csvCell(label)).join(','),
    ...rows.map(entry => historyExportColumns.map(([field]) => csvCell(entry[field])).join(',')),
  ].join('\r\n')
}

export function downloadHistoryCsv(entries, date) {
  const blob = new Blob([`\ufeff${historyCsv(entries)}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `zcore-history-${date}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
