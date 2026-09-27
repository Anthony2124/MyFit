import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { lastNDays } from './date'
import type { Habit, HabitLog } from './types'

/** Habits (active and archived) plus their completion logs for the last `days` days. */
export function useHabits(days = 30) {
  const [allHabits, setAllHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const since = lastNDays(days)[0]
    const [h, l] = await Promise.all([
      supabase.from('habits').select('*').order('created_at'),
      supabase.from('habit_logs').select('id, habit_id, log_date').gte('log_date', since),
    ])
    setError(h.error?.message ?? l.error?.message ?? null)
    setAllHabits(h.data ?? [])
    setLogs(l.data ?? [])
    setLoading(false)
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  const habits = allHabits.filter((h) => !h.archived)
  const archived = allHabits.filter((h) => h.archived)

  const isDone = (habitId: string, date: string) => logs.some((l) => l.habit_id === habitId && l.log_date === date)

  async function toggle(habitId: string, date: string) {
    const existing = logs.find((l) => l.habit_id === habitId && l.log_date === date)
    if (existing) {
      setLogs((prev) => prev.filter((l) => l.id !== existing.id))
      const { error } = await supabase.from('habit_logs').delete().eq('id', existing.id)
      if (error) load()
    } else {
      const { data, error } = await supabase
        .from('habit_logs')
        .insert({ habit_id: habitId, log_date: date })
        .select('id, habit_id, log_date')
        .single()
      if (error) setError(error.message)
      else setLogs((prev) => [...prev, data])
    }
  }

  async function update(id: string, patch: Partial<Omit<Habit, 'id' | 'created_at'>>) {
    setAllHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)))
    const { error } = await supabase.from('habits').update(patch).eq('id', id)
    if (error) {
      setError(error.message)
      load()
    }
    return error?.message ?? null
  }

  async function remove(id: string) {
    setAllHabits((prev) => prev.filter((h) => h.id !== id))
    const { error } = await supabase.from('habits').delete().eq('id', id)
    if (error) {
      setError(error.message)
      load()
    }
  }

  function datesFor(habitId: string) {
    return new Set(logs.filter((l) => l.habit_id === habitId).map((l) => l.log_date))
  }

  return { habits, archived, logs, loading, error, reload: load, isDone, toggle, update, remove, datesFor }
}
