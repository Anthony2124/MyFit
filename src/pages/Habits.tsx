import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useHabits } from '../lib/useHabits'
import { lastNDays, longestStreak, shortDay, streak } from '../lib/date'
import type { Habit } from '../lib/types'
import { Heatmap } from '../components/Charts'
import { useToast } from '../components/Toast'

const COLORS = ['#4f8a6e', '#5b7fb8', '#c07a4a', '#9a67b0', '#c05c72', '#6b9a3a', '#3a8f9a', '#b89a2e']
const ICONS = ['', '🚶', '🏃', '💧', '📖', '🧘', '🥗', '💊', '🛏️', '✍️', '🎸', '🧹', '📵', '🌞', '🙏', '💪']

const TEMPLATES = [
  { name: '10-minute walk', icon: '🚶', target: 5 },
  { name: 'Drink water first thing', icon: '💧', target: 7 },
  { name: 'Read 10 pages', icon: '📖', target: 5 },
  { name: 'Meditate 5 minutes', icon: '🧘', target: 7 },
  { name: 'No phone in bed', icon: '📵', target: 7 },
  { name: 'Journal one line', icon: '✍️', target: 7 },
]

function HabitFields({
  name,
  setName,
  target,
  setTarget,
  color,
  setColor,
  icon,
  setIcon,
}: {
  name: string
  setName: (v: string) => void
  target: number
  setTarget: (v: number) => void
  color: string
  setColor: (v: string) => void
  icon: string
  setIcon: (v: string) => void
}) {
  return (
    <>
      <input placeholder="New habit, e.g. 10-minute walk" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label="Habit name" />
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
      <label className="row small">
        Icon
        <select value={icon} onChange={(e) => setIcon(e.target.value)}>
          {ICONS.map((i) => (
            <option key={i} value={i}>
              {i || 'None'}
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
    </>
  )
}

function EditHabit({ habit, onSave, onCancel }: { habit: Habit; onSave: (patch: Partial<Habit>) => void; onCancel: () => void }) {
  const [name, setName] = useState(habit.name)
  const [target, setTarget] = useState(habit.target_per_week)
  const [color, setColor] = useState(habit.color)
  const [icon, setIcon] = useState(habit.icon ?? '')
  return (
    <form
      className="row wrap editrow"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) onSave({ name: name.trim(), target_per_week: target, color, icon: icon || null })
      }}
    >
      <HabitFields {...{ name, setName, target, setTarget, color, setColor, icon, setIcon }} />
      <button>Save</button>
      <button type="button" className="ghost" onClick={onCancel}>
        Cancel
      </button>
    </form>
  )
}

export default function Habits() {
  const { habits, archived, loading, error, reload, isDone, toggle, update, remove, datesFor } = useHabits(84)
  const toast = useToast()
  const [name, setName] = useState('')
  const [target, setTarget] = useState(7)
  const [color, setColor] = useState(COLORS[0])
  const [icon, setIcon] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const week = lastNDays(7)
  const month = lastNDays(30)

  async function create(fields: { name: string; target_per_week: number; color: string; icon: string | null }) {
    const { error } = await supabase.from('habits').insert(fields)
    if (error) return toast(error.message, 'error')
    toast(`Added “${fields.name}”`)
    reload()
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await create({ name: name.trim(), target_per_week: target, color, icon: icon || null })
    setName('')
    setIcon('')
  }

  async function archive(h: Habit) {
    await update(h.id, { archived: true })
    toast(`Archived “${h.name}”. You can restore it below.`)
  }

  async function destroy(h: Habit) {
    if (!confirm(`Permanently delete “${h.name}” and all its history?`)) return
    await remove(h.id)
    toast('Habit deleted')
  }

  const existing = new Set(habits.map((h) => h.name.toLowerCase()))
  const suggestions = TEMPLATES.filter((t) => !existing.has(t.name.toLowerCase()))

  return (
    <section className="stack">
      <h1>Habits</h1>
      {error && <p className="notice error">{error}</p>}

      <form onSubmit={add} className="card row wrap">
        <HabitFields {...{ name, setName, target, setTarget, color, setColor, icon, setIcon }} />
        <button>Add</button>
      </form>

      {!loading && habits.length < 3 && suggestions.length > 0 && (
        <div className="card stack">
          <h2>Ideas to start with</h2>
          <div className="row wrap">
            {suggestions.map((t, i) => (
              <button
                key={t.name}
                className="chip"
                onClick={() => create({ name: t.name, target_per_week: t.target, color: COLORS[i % COLORS.length], icon: t.icon })}
              >
                {t.icon} {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

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
                if (editing === h.id) {
                  return (
                    <tr key={h.id}>
                      <td colSpan={11}>
                        <EditHabit
                          habit={h}
                          onCancel={() => setEditing(null)}
                          onSave={async (patch) => {
                            await update(h.id, patch)
                            setEditing(null)
                            toast('Habit updated')
                          }}
                        />
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr key={h.id}>
                    <td className="habit-name">
                      <button className="link plain" onClick={() => setExpanded(expanded === h.id ? null : h.id)} aria-expanded={expanded === h.id}>
                        <span className="dot" style={{ background: h.color }} />
                        {h.icon && <span aria-hidden="true">{h.icon} </span>}
                        {h.name}
                      </button>
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
                    <td className="nowrap">
                      <button className="link small" onClick={() => setEditing(h.id)}>
                        Edit
                      </button>{' '}
                      <button className="link small" onClick={() => archive(h)}>
                        Archive
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="muted small">Tap a habit's name to see its history.</p>
        </div>
      )}

      {habits
        .filter((h) => h.id === expanded)
        .map((h) => {
          const dates = datesFor(h.id)
          const rate = Math.round((month.filter((d) => dates.has(d)).length / 30) * 100)
          return (
            <div key={h.id} className="card stack">
              <div className="row between">
                <h2>
                  {h.icon} {h.name}
                </h2>
                <button className="link small" onClick={() => setExpanded(null)}>
                  Close
                </button>
              </div>
              <div className="tiles">
                <div className="tile">
                  <span className="muted small">Current streak</span>
                  <strong>{streak(dates)} days</strong>
                </div>
                <div className="tile">
                  <span className="muted small">Best streak (12 wk)</span>
                  <strong>{longestStreak(dates)} days</strong>
                </div>
                <div className="tile">
                  <span className="muted small">Last 30 days</span>
                  <strong>{rate}%</strong>
                </div>
                <div className="tile">
                  <span className="muted small">Total check-ins (12 wk)</span>
                  <strong>{dates.size}</strong>
                </div>
              </div>
              <Heatmap
                values={new Map([...dates].map((d) => [d, 1]))}
                color={h.color}
                label={`${h.name} completion over the last 12 weeks`}
                describe={(key, v) => `${key}: ${v ? 'done' : 'not done'}`}
              />
            </div>
          )
        })}

      {archived.length > 0 && (
        <details className="card">
          <summary>Archived habits ({archived.length})</summary>
          <ul className="list stack" style={{ marginTop: 12 }}>
            {archived.map((h) => (
              <li key={h.id} className="row between">
                <span>
                  <span className="dot" style={{ background: h.color }} />
                  {h.icon} {h.name}
                </span>
                <span className="row">
                  <button className="link small" onClick={() => update(h.id, { archived: false }).then(() => toast('Habit restored'))}>
                    Restore
                  </button>
                  <button className="link small danger-text" onClick={() => destroy(h)}>
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
