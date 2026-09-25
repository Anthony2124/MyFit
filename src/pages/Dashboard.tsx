import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useHabits } from '../lib/useHabits'
import { daysAgo, streak, toDateKey } from '../lib/date'
import { MOOD_LABELS, type MoodEntry, type SleepLog } from '../lib/types'
import MoodForm from '../components/MoodForm'

export default function Dashboard() {
  const today = toDateKey()
  const { habits, loading, isDone, toggle, datesFor } = useHabits(30)
  const [lastMood, setLastMood] = useState<MoodEntry | null>(null)
  const [lastSleep, setLastSleep] = useState<SleepLog | null>(null)

  async function loadSummary() {
    const [m, s] = await Promise.all([
      supabase.from('mood_entries').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('sleep_logs').select('*').order('sleep_date', { ascending: false }).limit(1).maybeSingle(),
    ])
    setLastMood(m.data)
    setLastSleep(s.data)
  }

  useEffect(() => {
    loadSummary()
  }, [])

  const doneToday = habits.filter((h) => isDone(h.id, today)).length
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <section className="stack">
      <h1>{greeting}</h1>

      <div className="tiles">
        <div className="card tile">
          <span className="muted small">Habits today</span>
          <strong>
            {doneToday}/{habits.length}
          </strong>
        </div>
        <div className="card tile">
          <span className="muted small">Last check-in</span>
          <strong>{lastMood ? `${MOOD_LABELS[lastMood.mood].emoji} ${MOOD_LABELS[lastMood.mood].label}` : '—'}</strong>
        </div>
        <div className="card tile">
          <span className="muted small">Last night's sleep</span>
          <strong>{lastSleep ? `${Number(lastSleep.hours)} h` : '—'}</strong>
        </div>
      </div>

      <div className="card stack">
        <div className="row between">
          <h2>Today's habits</h2>
          <Link to="/habits" className="small">
            Manage
          </Link>
        </div>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : habits.length === 0 ? (
          <p className="muted">
            <Link to="/habits">Add your first habit</Link> to start tracking.
          </p>
        ) : (
          <ul className="checklist">
            {habits.map((h) => (
              <li key={h.id}>
                <label className="row">
                  <input type="checkbox" checked={isDone(h.id, today)} onChange={() => toggle(h.id, today)} style={{ accentColor: h.color }} />
                  <span className={isDone(h.id, today) ? 'done' : ''}>{h.name}</span>
                  <span className="muted small">{streak(datesFor(h.id))}🔥</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MoodForm compact onSaved={loadSummary} />

      {!lastSleep || lastSleep.sleep_date < daysAgo(1) ? (
        <p className="card">
          😴 How did you sleep? <Link to="/sleep">Log last night</Link>
        </p>
      ) : null}
    </section>
  )
}
