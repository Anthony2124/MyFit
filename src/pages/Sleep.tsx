import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { daysAgo, hoursBetween, lastNDays, prettyDate, shortDay, toDateKey } from '../lib/date'
import { useProfile } from '../lib/profile'
import type { SleepLog } from '../lib/types'
import { BarChart } from '../components/Charts'
import { useToast } from '../components/Toast'

const QUALITY = ['', 'Terrible', 'Poor', 'Okay', 'Good', 'Excellent']

export default function Sleep() {
  const toast = useToast()
  const { profile } = useProfile()
  const goal = profile?.sleep_goal ?? 8
  const [logs, setLogs] = useState<SleepLog[]>([])
  const [date, setDate] = useState(daysAgo(1))
  const [mode, setMode] = useState<'hours' | 'times'>('times')
  const [hours, setHours] = useState(7.5)
  const [bed, setBed] = useState('23:00')
  const [wake, setWake] = useState('07:00')
  const [quality, setQuality] = useState(3)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('sleep_logs').select('*').order('sleep_date', { ascending: false }).limit(60)
    setLogs(data ?? [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const effectiveHours = mode === 'times' ? hoursBetween(bed, wake) : hours

  async function save(e: FormEvent) {
    e.preventDefault()
    // Upsert so re-logging the same night corrects it instead of failing.
    const { error } = await supabase
      .from('sleep_logs')
      .upsert({ sleep_date: date, hours: effectiveHours, quality, note: note.trim() || null }, { onConflict: 'user_id,sleep_date' })
    setError(error?.message ?? null)
    if (!error) {
      setNote('')
      toast(`Saved ${effectiveHours} h for ${prettyDate(date)}`)
      load()
    }
  }

  function edit(l: SleepLog) {
    setDate(l.sleep_date)
    setMode('hours')
    setHours(Number(l.hours))
    setQuality(l.quality)
    setNote(l.note ?? '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function remove(id: string) {
    if (!confirm('Delete this night?')) return
    await supabase.from('sleep_logs').delete().eq('id', id)
    setLogs((prev) => prev.filter((l) => l.id !== id))
  }

  const byDate = new Map(logs.map((l) => [l.sleep_date, l]))
  // Chart the nights *before* each of the last 14 days (the most recent is last night).
  const nights = lastNDays(15).slice(0, 14)
  const points = nights.map((d) => {
    const l = byDate.get(d)
    return { label: shortDay(d), value: l ? Number(l.hours) : null, title: l ? `${prettyDate(d)}: ${Number(l.hours)} h, ${QUALITY[l.quality]}` : `${prettyDate(d)}: not logged` }
  })

  const week = lastNDays(8).slice(0, 7).map((d) => byDate.get(d)).filter((l): l is SleepLog => !!l)
  const avgHours = week.length ? week.reduce((s, l) => s + Number(l.hours), 0) / week.length : null
  const avgQuality = week.length ? week.reduce((s, l) => s + l.quality, 0) / week.length : null
  const debt = week.reduce((s, l) => s + Math.max(0, goal - Number(l.hours)), 0)

  return (
    <section className="stack">
      <h1>Sleep</h1>
      <form onSubmit={save} className="card stack">
        <div className="row between wrap">
          <h2>Log a night</h2>
          <div className="segmented" role="group" aria-label="Entry mode">
            <button type="button" className={mode === 'times' ? 'on' : ''} onClick={() => setMode('times')}>
              Bed &amp; wake time
            </button>
            <button type="button" className={mode === 'hours' ? 'on' : ''} onClick={() => setMode('hours')}>
              Hours
            </button>
          </div>
        </div>
        <div className="row wrap">
          <label>
            Night of
            <input type="date" value={date} max={toDateKey()} onChange={(e) => setDate(e.target.value)} />
          </label>
          {mode === 'times' ? (
            <>
              <label>
                Went to bed
                <input type="time" value={bed} onChange={(e) => setBed(e.target.value)} />
              </label>
              <label>
                Woke up
                <input type="time" value={wake} onChange={(e) => setWake(e.target.value)} />
              </label>
              <span className="muted small">= {effectiveHours} h</span>
            </>
          ) : (
            <label>
              Hours slept
              <input type="number" step={0.25} min={0} max={24} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
            </label>
          )}
          <label>
            Quality
            <select value={quality} onChange={(e) => setQuality(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((q) => (
                <option key={q} value={q}>
                  {q} – {QUALITY[q]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <input placeholder="Notes (caffeine late? woke up at 3am?)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
        {byDate.has(date) && <p className="muted small">You already logged this night — saving will update it.</p>}
        {error && <p className="notice error">{error}</p>}
        <button>Save</button>
      </form>

      {avgHours !== null && (
        <div className="tiles">
          <div className="card tile">
            <span className="muted small">7-night average</span>
            <strong>{avgHours.toFixed(1)} h</strong>
          </div>
          <div className="card tile">
            <span className="muted small">Average quality</span>
            <strong>{avgQuality!.toFixed(1)} / 5</strong>
          </div>
          <div className="card tile">
            <span className="muted small">Sleep debt vs {goal} h goal</span>
            <strong className={debt > 5 ? 'warn' : ''}>{debt.toFixed(1)} h</strong>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="card stack">
          <h2>Last 14 nights</h2>
          <BarChart points={points} goal={goal} color="var(--c-purple)" label={`Hours slept over the last 14 nights, goal ${goal} hours`} format={(v) => `${v}h`} />
          <p className="muted small">Dashed line: your {goal} h goal. Change it in Settings.</p>
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
                <td className="nowrap">{prettyDate(l.sleep_date)}</td>
                <td>{Number(l.hours).toFixed(2).replace(/\.?0+$/, '')}</td>
                <td title={QUALITY[l.quality]}>
                  {'★'.repeat(l.quality)}
                  {'☆'.repeat(5 - l.quality)}
                </td>
                <td className="muted">{l.note}</td>
                <td className="nowrap">
                  <button className="link small" onClick={() => edit(l)}>
                    Edit
                  </button>{' '}
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
