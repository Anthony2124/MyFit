import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useHabits } from '../lib/useHabits'
import { lastNDays, shortDay, streak } from '../lib/date'

const COLORS = ['#4f8a6e', '#5b7fb8', '#c07a4a', '#9a67b0', '#c05c72', '#6b9a3a']

export default function Habits() {
  const { habits, loading, error, reload, isDone, toggle, datesFor } = useHabits(30)
  const [name, setName] = useState('')
  const [target, setTarget] = useState(7)
  const [color, setColor] = useState(COLORS[0])
  const week = lastNDays(7)

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await supabase.from('habits').insert({ name: name.trim(), target_per_week: target, color })
    setName('')
    reload()
  }

  async function archive(id: string) {
    await supabase.from('habits').update({ archived: true }).eq('id', id)
    reload()
  }

  return (
    <section className="stack">
      <h1>Habits</h1>
      {error && <p className="notice error">{error}</p>}

      <form onSubmit={add} className="card row wrap">
        <input placeholder="New habit, e.g. 10-minute walk" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <label className="row small">
          Goal
          <select value={target} onChange={(e) => setTarget(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n}× / week
              </option>
            ))}
          </select>
        </label>
        <div className="row">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c}
              aria-label={`Color ${c}`}
              className={`swatch ${c === color ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <button>Add</button>
      </form>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : habits.length === 0 ? (
        <p className="muted">No habits yet. Start with one small thing you can do even on a bad day.</p>
      ) : (
        <div className="card">
          <table className="grid">
            <thead>
              <tr>
                <th />
                {week.map((d) => (
                  <th key={d}>{shortDay(d)}</th>
                ))}
                <th>This week</th>
                <th>Streak</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {habits.map((h) => {
                const done = week.filter((d) => isDone(h.id, d)).length
                return (
                  <tr key={h.id}>
                    <td className="habit-name">
                      <span className="dot" style={{ background: h.color }} />
                      {h.name}
                    </td>
                    {week.map((d) => (
                      <td key={d}>
                        <button
                          className={`cell ${isDone(h.id, d) ? 'on' : ''}`}
                          style={isDone(h.id, d) ? { background: h.color, borderColor: h.color } : undefined}
                          onClick={() => toggle(h.id, d)}
                          aria-label={`${h.name} on ${d}`}
                          aria-pressed={isDone(h.id, d)}
                        />
                      </td>
                    ))}
                    <td className={done >= h.target_per_week ? 'good' : 'muted'}>
                      {done}/{h.target_per_week}
                    </td>
                    <td>{streak(datesFor(h.id))}🔥</td>
                    <td>
                      <button className="link small" onClick={() => archive(h.id)}>
                        Archive
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
