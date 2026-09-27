import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { lastNDays, shortDay, toDateKey } from '../lib/date'
import { MOOD_LABELS, type MoodEntry } from '../lib/types'
import MoodForm from '../components/MoodForm'
import { LineChart } from '../components/Charts'
import { useToast } from '../components/Toast'

export default function Mood() {
  const toast = useToast()
  const [entries, setEntries] = useState<MoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [range, setRange] = useState(30)

  const load = useCallback(async () => {
    const { data } = await supabase.from('mood_entries').select('*').order('created_at', { ascending: false }).limit(500)
    setEntries(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function remove(id: string) {
    if (!confirm('Delete this entry?')) return
    const { error } = await supabase.from('mood_entries').delete().eq('id', id)
    if (error) return toast(error.message, 'error')
    setEntries((prev) => prev.filter((e) => e.id !== id))
    toast('Entry deleted')
  }

  // Average mood per calendar day for the chart.
  const days = lastNDays(range)
  const byDay = useMemo(() => {
    const m = new Map<string, number[]>()
    for (const e of entries) {
      const k = toDateKey(new Date(e.created_at))
      m.set(k, [...(m.get(k) ?? []), e.mood])
    }
    return m
  }, [entries])
  const points = days.map((d) => {
    const v = byDay.get(d)
    const avg = v ? v.reduce((a, b) => a + b, 0) / v.length : null
    return {
      label: range <= 14 ? shortDay(d) : d.slice(5),
      value: avg === null ? null : Math.round(avg * 10) / 10,
      title: avg === null ? undefined : `${d}: ${avg.toFixed(1)} (${v!.length} check-in${v!.length > 1 ? 's' : ''})`,
    }
  })
  const inRange = entries.filter((e) => toDateKey(new Date(e.created_at)) >= days[0])
  const avg = inRange.length ? inRange.reduce((s, e) => s + e.mood, 0) / inRange.length : null
  const energyEntries = inRange.filter((e) => e.energy)
  const avgEnergy = energyEntries.length ? energyEntries.reduce((s, e) => s + e.energy!, 0) / energyEntries.length : null

  const allTags = [...new Set(entries.flatMap((e) => e.tags))].sort()
  const q = query.trim().toLowerCase()
  const filtered = entries.filter(
    (e) => (!tag || e.tags.includes(tag)) && (!q || e.note?.toLowerCase().includes(q) || e.tags.some((t) => t.includes(q))),
  )

  return (
    <section className="stack">
      <h1>Mood journal</h1>
      <MoodForm onSaved={load} extraTags={allTags} />

      {entries.length > 1 && (
        <div className="card stack">
          <div className="row between wrap">
            <h2>Trend</h2>
            <div className="segmented" role="group" aria-label="Range">
              {[7, 30, 90].map((n) => (
                <button key={n} className={range === n ? 'on' : ''} onClick={() => setRange(n)}>
                  {n}d
                </button>
              ))}
            </div>
          </div>
          <LineChart points={points} min={1} max={5} label={`Average daily mood over the last ${range} days`} />
          <div className="row wrap small muted">
            {avg !== null && <span>Average mood: <strong>{avg.toFixed(1)}</strong> / 5</span>}
            {avgEnergy !== null && <span>· Average energy: <strong>{avgEnergy.toFixed(1)}</strong> / 5</span>}
            <span>· {inRange.length} check-ins</span>
          </div>
        </div>
      )}

      <div className="card stack">
        <input type="search" placeholder="Search notes and tags…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search journal" />
        {allTags.length > 0 && (
          <div className="row wrap">
            <button className={`chip ${tag === null ? 'on' : ''}`} onClick={() => setTag(null)}>
              All
            </button>
            {allTags.map((t) => (
              <button key={t} className={`chip ${tag === t ? 'on' : ''}`} onClick={() => setTag(tag === t ? null : t)}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="muted">{entries.length ? 'No entries match.' : 'No check-ins yet.'}</p>
      ) : (
        <ul className="stack list">
          {filtered.map((e) => (
            <li key={e.id} className="card">
              <div className="row between">
                <strong>
                  {MOOD_LABELS[e.mood].emoji} {MOOD_LABELS[e.mood].label}
                  {e.energy && <span className="muted small"> · energy {e.energy}/5</span>}
                </strong>
                <span className="muted small">{new Date(e.created_at).toLocaleString()}</span>
              </div>
              {e.tags.length > 0 && (
                <div className="row wrap">
                  {e.tags.map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {e.note && <p className="note">{e.note}</p>}
              <button className="link small" onClick={() => remove(e.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
