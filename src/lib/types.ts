export interface Habit {
  id: string
  name: string
  color: string
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

export const MOOD_LABELS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '😞', label: 'Very low' },
  2: { emoji: '🙁', label: 'Low' },
  3: { emoji: '😐', label: 'Okay' },
  4: { emoji: '🙂', label: 'Good' },
  5: { emoji: '😄', label: 'Great' },
}
