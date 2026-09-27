export interface Profile {
  id: string
  display_name: string | null
  water_goal: number
  sleep_goal: number
  weight_unit: 'kg' | 'lb'
}

export interface Habit {
  id: string
  name: string
  color: string
  icon: string | null
  target_per_week: number
  archived: boolean
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  log_date: string
}

export interface MoodEntry {
  id: string
  mood: number
  energy: number | null
  tags: string[]
  note: string | null
  created_at: string
}

export interface SleepLog {
  id: string
  sleep_date: string
  hours: number
  quality: number
  note: string | null
}

export interface WaterLog {
  id: string
  log_date: string
  glasses: number
}

export interface Workout {
  id: string
  workout_date: string
  kind: string
  minutes: number
  intensity: number
  distance_km: number | null
  note: string | null
}

export interface BodyMetric {
  id: string
  measured_on: string
  weight_kg: number
  note: string | null
}

export const MOOD_LABELS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '😞', label: 'Very low' },
  2: { emoji: '🙁', label: 'Low' },
  3: { emoji: '😐', label: 'Okay' },
  4: { emoji: '🙂', label: 'Good' },
  5: { emoji: '😄', label: 'Great' },
}

export const INTENSITY_LABELS: Record<number, string> = { 1: 'Light', 2: 'Moderate', 3: 'Hard' }

export const WORKOUT_KINDS = ['Walk', 'Run', 'Cycling', 'Strength', 'Yoga', 'Swim', 'HIIT', 'Sports', 'Hike', 'Other']

export const KG_PER_LB = 0.45359237

/** Minutes per week; WHO guideline for moderate activity. */
export const WEEKLY_ACTIVE_GOAL = 150
