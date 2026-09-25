import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { daysAgo, toDateKey } from '../lib/date'
import type { SleepLog } from '../lib/types'

export default function Sleep() {
  const [logs, setLogs] = useState<SleepLog[]>([])
  const [date, setDate] = useState(daysAgo(1))
  const [hours, setHours] = useState(7.5)
  const [quality, setQuality] = useState(3)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('sleep_logs').select('*').order('sleep_date', { ascending: false }).limit(30)
    setLogs(data ?? [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function save(e: FormEvent) {
    e.preventDefault()
    // Upsert so re-logging the same night corrects it instead of failing.
    const { error } = await supabase
      .from('sleep_logs')
      .upsert({ sleep_date: date, hours, quality, note: note.trim() || null }, { onConflict: 'user_id,sleep_date' })
    setError(error?.message ?? null)
    if (!error) {
      setNote('')
      load()
    }
  }

  async function remove(id: string) {
    await supabase.from('sleep_logs').delete().eq('id', id)
    setLogs((prev) => prev.filter((l) => l.id !== id))
  }

  const week = logs.slice(0, 7)
  const avgHours = week.length ? week.reduce((s, l) => s + Number(l.hours), 0) / week.length : null

  return (
    <section className="stack">
      <h1>Sleep</h1>
      <form onSubmit={save} className="card stack">
        <div className="row wrap">
          <label>
            Night of
            <input type="date" value={date} max={toDateKey()} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Hours slept
            <input type="number" step={0.25} min={0} max={24} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
          </label>
          <label>
            Quality
            <select value={quality} onChange={(e) => setQuality(Number(e.target.value))}>
              <option value={1}>1 – Terrible</option>
              <option value={2}>2 – Poor</option>
              <option value={3}>3 – Okay</option>
              <option value={4}>4 – Good</option>
              <option value={5}>5 – Excellent</option>
            </select>
          </label>
        </div>
        <input placeholder="Notes (caffeine late? woke up at 3am?)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
        {error && <p className="notice error">{error}</p>}
        <button>Save</button>
      </form>

      {avgHours !== null && (
        <div className="card row between">
          <span>Average over last {week.length} nights</span>
          <strong>{avgHours.toFixed(1)} h</strong>
        </div>
      )}

      <div className="card">
        <table className="grid left">
          <thead>
            <tr>
              <th>Night</th>
              <th>Hours</th>
              <th>Quality</th>
              <th>Notes</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{l.sleep_date}</td>
                <td>{Number(l.hours).toFixed(2).replace(/\.?0+$/, '')}</td>
                <td>{'★'.repeat(l.quality)}{'☆'.repeat(5 - l.quality)}</td>
                <td className="muted">{l.note}</td>
                <td>
                  <button className="link small" onClick={() => remove(l.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No nights logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
