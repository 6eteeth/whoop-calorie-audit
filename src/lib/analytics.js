export const numberOrNull = value => {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export const average = (rows, key) => {
  const values = rows.map(row => numberOrNull(row[key])).filter(value => value !== null)
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

export const caloriesFromMacros = (carbs, protein, fat) => Math.round(Number(carbs) * 4 + Number(protein) * 4 + Number(fat) * 9)

export const calendarDay = date => Date.UTC(...date.split('-').map((value, index) => index === 1 ? Number(value) - 1 : Number(value))) / 86400000

export function weeklyWeightAverages(entries, limit = 16) {
  const groups = new Map()
  entries.filter(entry => numberOrNull(entry.weight_lb) !== null).forEach(entry => {
    const day = calendarDay(entry.entry_date)
    const sunday = day - new Date(day * 86400000).getUTCDay()
    const week = new Date(sunday * 86400000).toISOString().slice(0, 10)
    const values = groups.get(week) || []
    values.push(Number(entry.weight_lb))
    groups.set(week, values)
  })
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, values]) => ({ week, average: values.reduce((sum, value) => sum + value, 0) / values.length, days: values.length }))
    .slice(-limit)
}

export const weightTrend = rows => {
  if (rows.length < 2) return null
  const startDay = calendarDay(rows[0].entry_date)
  const points = rows.map(row => ({ day: calendarDay(row.entry_date) - startDay, weight: numberOrNull(row.weight_lb) }))
  const meanDay = points.reduce((sum, point) => sum + point.day, 0) / points.length
  const meanWeight = points.reduce((sum, point) => sum + point.weight, 0) / points.length
  const dayVariance = points.reduce((sum, point) => sum + ((point.day - meanDay) ** 2), 0)
  if (!dayVariance) return null
  return points.reduce((sum, point) => sum + ((point.day - meanDay) * (point.weight - meanWeight)), 0) / dayVariance
}

export function calculateMetrics(entries, days = 14) {
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

  const dailyWeightChange = weightTrend(metabolicRows)
  const estimatedActual = avgIntake - (dailyWeightChange * 3500)

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
