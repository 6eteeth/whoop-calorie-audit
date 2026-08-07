import { localDateKey } from './dates'

export const workoutOptions = ['None', 'Strength', 'Cardio', 'StairMaster', 'Walking', 'Running', 'Cycling', 'Rowing', 'Sports', 'Other']

export function emptyEntry() {
  return {
    entry_date: localDateKey(), weight_lb: '', calories_eaten: '', carbs_g: '', fat_g: '', protein_g: '', whoop_calories_burned: '', steps: '',
    whoop_day_strain: '', whoop_average_heart_rate: '', whoop_max_heart_rate: '', whoop_recovery_score: '', whoop_resting_heart_rate: '', whoop_hrv_rmssd_milli: '', whoop_spo2_percentage: '', whoop_skin_temp_celsius: '',
    whoop_sleep_duration_minutes: '', whoop_time_in_bed_minutes: '', whoop_awake_minutes: '', whoop_light_sleep_minutes: '', whoop_slow_wave_sleep_minutes: '', whoop_rem_sleep_minutes: '', whoop_sleep_performance_percentage: '', whoop_sleep_efficiency_percentage: '', whoop_sleep_consistency_percentage: '', whoop_respiratory_rate: '', whoop_disturbance_count: '', whoop_sleep_cycle_count: '', whoop_sleep_needed_minutes: '', whoop_synced_at: null,
    workout_1_type: 'None', workout_1_minutes: '', workout_1_calories: '', workout_1_whoop_calories: '', workout_2_type: 'None', workout_2_minutes: '', workout_2_calories: '', workout_2_whoop_calories: '', workout_3_type: 'None', workout_3_minutes: '', workout_3_calories: '', workout_3_whoop_calories: '', used_ai_calorie_estimate: false, caffeine_after_3pm: false, alcohol_consumed: false, notes: '',
  }
}

export const formatNumber = (value, digits = 0) => Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: digits }) : '—'
export const hasValue = value => value !== '' && value != null
export const nutritionComplete = entry => [entry.carbs_g, entry.fat_g, entry.protein_g].every(hasValue)
export const whoopComplete = entry => [entry.whoop_calories_burned, entry.whoop_day_strain, entry.whoop_recovery_score, entry.whoop_resting_heart_rate, entry.whoop_hrv_rmssd_milli, entry.whoop_sleep_duration_minutes].every(hasValue)
export const workoutComplete = entry => [1, 2, 3].some(n => hasValue(entry[`workout_${n}_minutes`]) || hasValue(entry[`workout_${n}_calories`]) || hasValue(entry[`workout_${n}_whoop_calories`]))
export const entryCompletion = entry => ({ weight: hasValue(entry.weight_lb), nutrition: nutritionComplete(entry), workouts: workoutComplete(entry), whoop: whoopComplete(entry) })
