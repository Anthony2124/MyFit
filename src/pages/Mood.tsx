import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MOOD_LABELS, type MoodEntry } from '../lib/types'
import MoodForm from '../components/MoodForm'

export default function Mood() {
  const [entries, setEntries] = useState<MoodEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase.from('mood_entries').select('*').order('created_at', { ascending: false }).limit(60)
    setEntries(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function remove(id: string) {
    if (!confirm('Delete this entry?')) return
    await supabase.from('mood_entries').delete().eq('id', id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const recent = entries.slice(0, 14).reverse()
  const avg = entries.length ? entries.slice(0, 7).reduce((s, e) => s + e.mood, 0) / Math.min(7, entries.length) : null

  return (
    <section className="stack">
      <h1>Mood journal</h1>
      <MoodForm onSaved={load} />

      {recent.length > 1 && (
        <div className="card">
          <div className="row between">
            <h2>Recent check-ins</h2>
            {avg !== null && <span className="muted">Last 7 average: {avg.toFixed(1)} / 5</span>}
          </div>
          <div className="bars" role="img" aria-label="Mood over recent check-ins">
            {recent.map((e) => (
              <div key={e.id} className="bar" style={{ height: `${e.mood * 20}%` }} title={`${MOOD_LABELS[e.mood].label} · ${new Date(e.created_at).toLocaleString()}`} />
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <ul className="stack list">
          {entries.map((e) => (
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
