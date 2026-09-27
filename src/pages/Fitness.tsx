import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { daysAgo, lastNDays, parseKey, prettyDate, streak, toDateKey, weekStart } from '../lib/date'
import { useProfile } from '../lib/profile'
import { displayWeight, toKg } from '../lib/units'
import { INTENSITY_LABELS, WEEKLY_ACTIVE_GOAL, WORKOUT_KINDS, type BodyMetric, type Workout } from '../lib/types'
import { BarChart, LineChart } from '../components/Charts'
import { useToast } from '../components/Toast'

const KIND_ICONS: Record<string, string> = {
  Walk: '🚶', Run: '🏃', Cycling: '🚴', Strength: '🏋️', Yoga: '🧘', Swim: '🏊', HIIT: '⚡', Sports: '⚽', Hike: '🥾', Other: '✨',
}

export default function Fitness() {
  const [tab, setTab] = useState<'workouts' | 'weight'>('workouts')
  return (
    <section className="stack">
      <div className="row between wrap">
        <h1>Fitness</h1>
        <div className="segmented" role="tablist">
          <button role="tab" aria-selected={tab === 'workouts'} className={tab === 'workouts' ? 'on' : ''} onClick={() => setTab('workouts')}>
            Workouts
          </button>
          <button role="tab" aria-selected={tab === 'weight'} className={tab === 'weight' ? 'on' : ''} onClick={() => setTab('weight')}>
            Weight
          </button>
        </div>
      </div>
      {tab === 'workouts' ? <Workouts /> : <Weight />}
    </section>
  )
}

function Workouts() {
  const toast = useToast()
  const [items, setItems] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(toDateKey())
  const [kind, setKind] = useState('Walk')
  const [minutes, setMinutes] = useState(30)
  const [intensity, setIntensity] = useState(2)
  const [distance, setDistance] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('workouts')
      .select('*')
      .gte('workout_date', daysAgo(365))
      .order('workout_date', { ascending: false })
      .order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function save(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('workouts').insert({
      workout_date: date,
      kind,
      minutes,
      intensity,
      distance_km: distance ? Number(distance) : null,
      note: note.trim() || null,
    })
    if (error) return toast(error.message, 'error')
    toast(`${KIND_ICONS[kind] ?? ''} ${kind} logged — ${minutes} min`)
    setNote('')
    setDistance('')
    load()
  }

  function repeat(w: Workout) {
    setKind(w.kind)
    setMinutes(w.minutes)
    setIntensity(w.intensity)
    setDistance(w.distance_km ? String(w.distance_km) : '')
    setDate(toDateKey())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function remove(id: string) {
    if (!confirm('Delete this workout?')) return
    await supabase.from('workouts').delete().eq('id', id)
    setItems((prev) => prev.filter((w) => w.id !== id))
  }

  // Weekly minutes for the last 8 weeks (Monday-start).
  const thisWeek = weekStart()
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const d = parseKey(thisWeek)
    d.setDate(d.getDate() - (7 - i) * 7)
    return toDateKey(d)
  })
  const minutesInWeek = (start: string) => {
    const end = parseKey(start)
    end.setDate(end.getDate() + 7)
    const endKey = toDateKey(end)
    return items.filter((w) => w.workout_date >= start && w.workout_date < endKey).reduce((s, w) => s + w.minutes, 0)
  }
  const weekPoints = weeks.map((w) => ({ label: w.slice(5), value: minutesInWeek(w), title: `Week of ${prettyDate(w)}: ${minutesInWeek(w)} min` }))
  const weekMins = minutesInWeek(thisWeek)
  const weekCount = items.filter((w) => w.workout_date >= thisWeek).length
  const activeDays = new Set(items.map((w) => w.workout_date))
  const month = lastNDays(30)
  const monthDays = month.filter((d) => activeDays.has(d)).length

  // Personal bests
  const longest = items.reduce<Workout | null>((b, w) => (!b || w.minutes > b.minutes ? w : b), null)
  const farthest = items.reduce<Workout | null>((b, w) => (w.distance_km && (!b || Number(w.distance_km) > Number(b.distance_km)) ? w : b), null)
  const favorite = Object.entries(
    items.reduce<Record<string, number>>((acc, w) => ({ ...acc, [w.kind]: (acc[w.kind] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1])[0]

  return (
    <>
      <form onSubmit={save} className="card stack">
        <h2>Log a workout</h2>
        <div className="row wrap">
          {WORKOUT_KINDS.map((k) => (
            <button type="button" key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
              {KIND_ICONS[k]} {k}
            </button>
          ))}
        </div>
        <div className="row wrap">
          <label>
            Date
            <input type="date" value={date} max={toDateKey()} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Minutes
            <input type="number" min={1} max={1440} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} required />
          </label>
          <label>
            Intensity
            <select value={intensity} onChange={(e) => setIntensity(Number(e.target.value))}>
              {[1, 2, 3].map((i) => (
                <option key={i} value={i}>
                  {INTENSITY_LABELS[i]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Distance (km, optional)
            <input type="number" min={0} step={0.1} value={distance} onChange={(e) => setDistance(e.target.value)} />
          </label>
        </div>
        <input placeholder="Notes (how did it feel?)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
        <button>Save workout</button>
      </form>

      <div className="tiles">
        <div className="card tile">
          <span className="muted small">This week</span>
          <strong>
            {weekMins} / {WEEKLY_ACTIVE_GOAL} min
          </strong>
          <div className="meter" aria-hidden="true">
            <div style={{ width: `${Math.min(100, (weekMins / WEEKLY_ACTIVE_GOAL) * 100)}%` }} />
          </div>
        </div>
        <div className="card tile">
          <span className="muted small">Workouts this week</span>
          <strong>{weekCount}</strong>
        </div>
        <div className="card tile">
          <span className="muted small">Active days (30d)</span>
          <strong>{monthDays}</strong>
        </div>
        <div className="card tile">
          <span className="muted small">Active-day streak</span>
          <strong>{streak(activeDays)} 🔥</strong>
        </div>
      </div>

      {items.length > 0 && (
        <div className="card stack">
          <h2>Weekly active minutes</h2>
          <BarChart points={weekPoints} goal={WEEKLY_ACTIVE_GOAL} color="var(--c-orange)" label="Active minutes per week, last 8 weeks" />
          <p className="muted small">Dashed line: 150 minutes/week, the WHO recommendation for moderate activity.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="card stack">
          <h2>Personal bests (past year)</h2>
          <div className="tiles">
            {longest && (
              <div className="tile">
                <span className="muted small">Longest session</span>
                <strong>
                  {KIND_ICONS[longest.kind]} {longest.minutes} min
                </strong>
                <span className="muted small">{prettyDate(longest.workout_date)}</span>
              </div>
            )}
            {farthest && (
              <div className="tile">
                <span className="muted small">Farthest distance</span>
                <strong>
                  {KIND_ICONS[farthest.kind]} {Number(farthest.distance_km)} km
                </strong>
                <span className="muted small">{prettyDate(farthest.workout_date)}</span>
              </div>
            )}
            {favorite && (
              <div className="tile">
                <span className="muted small">Favorite activity</span>
                <strong>
                  {KIND_ICONS[favorite[0]]} {favorite[0]}
                </strong>
                <span className="muted small">{favorite[1]} sessions</span>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No workouts yet. A walk counts!</p>
      ) : (
        <ul className="list stack">
          {items.slice(0, 50).map((w) => (
            <li key={w.id} className="card">
              <div className="row between wrap">
                <strong>
                  {KIND_ICONS[w.kind] ?? '✨'} {w.kind} · {w.minutes} min
                  {w.distance_km ? ` · ${Number(w.distance_km)} km` : ''}
                  <span className="muted small"> · {INTENSITY_LABELS[w.intensity]}</span>
                </strong>
                <span className="muted small">{prettyDate(w.workout_date)}</span>
              </div>
              {w.note && <p className="note">{w.note}</p>}
              <div className="row">
                <button className="link small" onClick={() => repeat(w)}>
                  Log again
                </button>
                <button className="link small" onClick={() => remove(w.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function Weight() {
  const toast = useToast()
  const { profile } = useProfile()
  const unit = profile?.weight_unit ?? 'kg'
  const [items, setItems] = useState<BodyMetric[]>([])
  const [date, setDate] = useState(toDateKey())
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const [range, setRange] = useState(90)

  const load = useCallback(async () => {
    const { data } = await supabase.from('body_metrics').select('*').order('measured_on', { ascending: false }).limit(730)
    setItems(data ?? [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function save(e: FormEvent) {
    e.preventDefault()
    const v = Number(value)
    if (!v) return
    const { error } = await supabase
      .from('body_metrics')
      .upsert({ measured_on: date, weight_kg: Math.round(toKg(v, unit) * 100) / 100, note: note.trim() || null }, { onConflict: 'user_id,measured_on' })
    if (error) return toast(error.message, 'error')
    toast('Weight saved')
    setValue('')
    setNote('')
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this entry?')) return
    await supabase.from('body_metrics').delete().eq('id', id)
    setItems((prev) => prev.filter((m) => m.id !== id))
  }

  const w = (m: BodyMetric) => displayWeight(Number(m.weight_kg), unit)
  const since = daysAgo(range)
  const inRange = items.filter((m) => m.measured_on >= since).reverse()
  const points = inRange.map((m) => ({ label: m.measured_on.slice(5), value: w(m), title: `${prettyDate(m.measured_on)}: ${w(m)} ${unit}` }))
  const latest = items[0]
  const monthAgo = items.find((m) => m.measured_on <= daysAgo(30))
  const change = latest && monthAgo ? Math.round((w(latest) - w(monthAgo)) * 10) / 10 : null
  const low = inRange.length ? Math.min(...inRange.map(w)) : null
  const high = inRange.length ? Math.max(...inRange.map(w)) : null

  return (
    <>
      <form onSubmit={save} className="card stack">
        <h2>Log weight</h2>
        <div className="row wrap">
          <label>
            Date
            <input type="date" value={date} max={toDateKey()} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Weight ({unit})
            <input type="number" step={0.1} min={unit === 'kg' ? 20 : 45} max={unit === 'kg' ? 400 : 880} value={value} onChange={(e) => setValue(e.target.value)} required />
          </label>
          <label className="grow">
            Note
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </label>
        </div>
        <button>Save</button>
        <p className="muted small">
          Daily weight naturally swings 1–2 kg with water and food. The trend over weeks matters more than any single day. Units can be changed in
          Settings.
        </p>
      </form>

      {latest && (
        <div className="tiles">
          <div className="card tile">
            <span className="muted small">Latest</span>
            <strong>
              {w(latest)} {unit}
            </strong>
            <span className="muted small">{prettyDate(latest.measured_on)}</span>
          </div>
          <div className="card tile">
            <span className="muted small">30-day change</span>
            <strong>{change === null ? '—' : `${change > 0 ? '+' : ''}${change} ${unit}`}</strong>
          </div>
          {low !== null && (
            <div className="card tile">
              <span className="muted small">Range ({range}d)</span>
              <strong>
                {low}–{high} {unit}
              </strong>
            </div>
          )}
        </div>
      )}

      {items.length > 1 && (
        <div className="card stack">
          <div className="row between wrap">
            <h2>Trend</h2>
            <div className="segmented" role="group" aria-label="Range">
              {[30, 90, 365].map((n) => (
                <button key={n} className={range === n ? 'on' : ''} onClick={() => setRange(n)}>
                  {n === 365 ? '1y' : `${n}d`}
                </button>
              ))}
            </div>
          </div>
          <LineChart points={points} color="var(--c-blue)" label={`Weight over the last ${range} days`} />
        </div>
      )}

      {items.length > 0 && (
        <div className="card">
          <table className="grid left">
            <thead>
              <tr>
                <th>Date</th>
                <th>Weight</th>
                <th>Note</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 30).map((m) => (
                <tr key={m.id}>
                  <td className="nowrap">{prettyDate(m.measured_on)}</td>
                  <td>
                    {w(m)} {unit}
                  </td>
                  <td className="muted">{m.note}</td>
                  <td>
                    <button className="link small" onClick={() => remove(m.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
