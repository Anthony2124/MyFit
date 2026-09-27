import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { lastNDays, toDateKey } from './date'
import type { WaterLog } from './types'

/** Water logs for the last `days` days, plus a setter for today's glass count. */
export function useWater(days = 14) {
  const [logs, setLogs] = useState<WaterLog[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('water_logs')
      .select('id, log_date, glasses')
      .gte('log_date', lastNDays(days)[0])
      .order('log_date')
    setError(error?.message ?? null)
    setLogs(data ?? [])
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  const glassesOn = (date: string) => logs.find((l) => l.log_date === date)?.glasses ?? 0

  async function setGlasses(glasses: number, date = toDateKey()) {
    const next = Math.max(0, Math.min(50, glasses))
    setLogs((prev) => {
      const rest = prev.filter((l) => l.log_date !== date)
      return [...rest, { id: prev.find((l) => l.log_date === date)?.id ?? date, log_date: date, glasses: next }]
    })
    const { error } = await supabase
      .from('water_logs')
      .upsert({ log_date: date, glasses: next, updated_at: new Date().toISOString() }, { onConflict: 'user_id,log_date' })
    if (error) {
      setError(error.message)
      load()
    }
  }

  return { logs, error, glassesOn, setGlasses, reload: load }
}
