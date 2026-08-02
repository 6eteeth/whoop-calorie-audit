export const numberOrNull = value => {
  if (value === '' || value == null) return null
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

  const metabolicRows = entries
    .filter(entry => new Date(`${entry.entry_date}T00:00:00`) >= cutoff)
    .filter(entry => numberOrNull(entry.weight_lb) !== null && numberOrNull(entry.calories_eaten) !== null)

  if (metabolicRows.length < 2) return { sampleDays: metabolicRows.length, wearableSampleDays: 0 }

  const first = metabolicRows[0]
  const last = metabolicRows.at(-1)
  const elapsed = Math.max(1, Math.round((new Date(last.entry_date) - new Date(first.entry_date)) / 86400000))
  const weightChange = numberOrNull(last.weight_lb) - numberOrNull(first.weight_lb)
  const avgIntake = average(metabolicRows, 'calories_eaten')
  const estimatedActual = avgIntake - ((weightChange * 3500) / elapsed)

  const wearableRows = metabolicRows.filter(entry => numberOrNull(entry.whoop_calories_burned) !== null)
  const avgWhoop = average(wearableRows, 'whoop_calories_burned')
  const error = avgWhoop == null ? null : avgWhoop - estimatedActual

  return {
    sampleDays: metabolicRows.length,
    wearableSampleDays: wearableRows.length,
    avgIntake,
    avgWhoop,
    estimatedActual,
    error,
    errorPct: estimatedActual && error != null ? (error / estimatedActual) * 100 : null,
    correction: avgWhoop ? estimatedActual / avgWhoop : null,
  }
}

export const totalWorkoutCalories = entry => [1, 2, 3].reduce((sum, n) => sum + (numberOrNull(entry[`workout_${n}_calories`]) ?? numberOrNull(entry[`workout_${n}_whoop_calories`]) ?? 0), 0)
export const totalWorkoutMinutes = entry => [1, 2, 3].reduce((sum, n) => sum + (numberOrNull(entry[`workout_${n}_minutes`]) || 0), 0)
