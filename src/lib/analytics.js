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
  if (!entries.length) return { sampleDays: 0, wearableSampleDays: 0, ready: false }

  // A "logged day" must include both weight and calculated calorie intake.
  // Use the most recent qualifying days so missed calendar days do not reset progress.
  const allMetabolicRows = entries
    .filter(entry => numberOrNull(entry.weight_lb) !== null && numberOrNull(entry.calories_eaten) !== null)
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))

  const metabolicRows = allMetabolicRows.slice(-days)
  const sampleDays = metabolicRows.length
  const wearableRows = metabolicRows.filter(entry => numberOrNull(entry.whoop_calories_burned) !== null)
  const avgIntake = average(metabolicRows, 'calories_eaten')

  if (sampleDays < days) {
    return {
      sampleDays,
      wearableSampleDays: wearableRows.length,
      avgIntake,
      avgWhoop: average(wearableRows, 'whoop_calories_burned'),
      ready: false,
    }
  }

  const first = metabolicRows[0]
  const last = metabolicRows.at(-1)
  const elapsed = Math.max(1, Math.round((new Date(`${last.entry_date}T12:00:00`) - new Date(`${first.entry_date}T12:00:00`)) / 86400000))
  const weightChange = numberOrNull(last.weight_lb) - numberOrNull(first.weight_lb)
  const estimatedActual = avgIntake - ((weightChange * 3500) / elapsed)

  const avgWhoop = average(wearableRows, 'whoop_calories_burned')
  const error = avgWhoop == null ? null : avgWhoop - estimatedActual

  return {
    sampleDays,
    wearableSampleDays: wearableRows.length,
    avgIntake,
    avgWhoop,
    estimatedActual,
    error,
    errorPct: estimatedActual && error != null ? (error / estimatedActual) * 100 : null,
    correction: avgWhoop ? estimatedActual / avgWhoop : null,
    ready: true,
  }
}

export const totalWorkoutCalories = entry => [1, 2, 3].reduce((sum, n) => sum + (numberOrNull(entry[`workout_${n}_calories`]) ?? numberOrNull(entry[`workout_${n}_whoop_calories`]) ?? 0), 0)
export const totalWorkoutMinutes = entry => [1, 2, 3].reduce((sum, n) => sum + (numberOrNull(entry[`workout_${n}_minutes`]) || 0), 0)
