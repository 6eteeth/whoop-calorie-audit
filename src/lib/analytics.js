export const numberOrNull = value => {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export const average = (rows, key) => {
  const values = rows.map(row => numberOrNull(row[key])).filter(value => value !== null)
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

export function calculateMetrics(entries, days = 28) {
  if (!entries.length) return null
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days + 1)
  cutoff.setHours(0, 0, 0, 0)
  const rows = entries.filter(entry => new Date(`${entry.entry_date}T00:00:00`) >= cutoff)
  if (rows.length < 2) return { sampleDays: rows.length }

  const first = rows[0]
  const last = rows.at(-1)
  const elapsed = Math.max(1, Math.round((new Date(last.entry_date) - new Date(first.entry_date)) / 86400000))
  const weightChange = numberOrNull(last.weight_lb) - numberOrNull(first.weight_lb)
  const avgIntake = average(rows, 'calories_eaten')
  const avgWhoop = average(rows, 'whoop_calories_burned')
  const estimatedActual = avgIntake - ((weightChange * 3500) / elapsed)
  const error = avgWhoop - estimatedActual

  return {
    sampleDays: rows.length,
    avgIntake,
    avgWhoop,
    estimatedActual,
    error,
    errorPct: estimatedActual ? (error / estimatedActual) * 100 : null,
    correction: avgWhoop ? estimatedActual / avgWhoop : null,
  }
}

export const totalWorkoutCalories = entry => [1, 2, 3].reduce((sum, n) => sum + (numberOrNull(entry[`workout_${n}_whoop_calories`]) || 0), 0)
export const totalWorkoutMinutes = entry => [1, 2, 3].reduce((sum, n) => sum + (numberOrNull(entry[`workout_${n}_minutes`]) || 0), 0)
