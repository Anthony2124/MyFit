import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useHabits } from '../lib/useHabits'
import { useProfile } from '../lib/profile'
import { daysAgo, streak, toDateKey, weekStart } from '../lib/date'
import { tipOfTheDay } from '../lib/tips'
import { MOOD_LABELS, WEEKLY_ACTIVE_GOAL, type MoodEntry, type SleepLog } from '../lib/types'
import MoodForm from '../components/MoodForm'
import WaterCard from '../components/WaterCard'
import { Ring } from '../components/Charts'


export default function Dashboard() {
  const today = toDateKey()
  const { profile } = useProfile()
  const { habits, loading, isDone, toggle, datesFor } = useHabits(60)
  const [lastMood, setLastMood] = useState<MoodEntry | null>(null)
  const [lastSleep, setLastSleep] = useState<SleepLog | null>(null)
  const [weekMinutes, setWeekMinutes] = useState(0)

  async function loadSummary() {
    const [m, s, w] = await Promise.all([
      supabase.from('mood_entries').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('sleep_logs').select('*').order('sleep_date', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('workouts').select('minutes').gte('workout_date', weekStart()),
    ])
    setLastMood(m.data)
    setLastSleep(s.data)
    setWeekMinutes((w.data ?? []).reduce((sum: number, x: { minutes: number }) => sum + x.minutes, 0))
  }

  useEffect(() => {
    loadSummary()
  }, [])

  const doneToday = habits.filter((h) => isDone(h.id, today)).length
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = profile?.display_name
  const sleepGoal = profile?.sleep_goal ?? 8
  const sleptRecently = lastSleep !== null && lastSleep.sleep_date >= daysAgo(1)

  return (
    <section className="stack">
      <div>
        <h1>
          {greeting}
          {name ? `, ${name}` : ''}
        </h1>
        <p className="muted small">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="tiles">
        <Link to="/habits" className="card tile ringtile">
          <Ring value={doneToday} max={habits.length || 1}>
            {doneToday}/{habits.length}
          </Ring>
          <span className="muted small">Habits today</span>
        </Link>
        <Link to="/fitness" className="card tile ringtile">
          <Ring value={weekMinutes} max={WEEKLY_ACTIVE_GOAL} color="var(--c-orange)">
            {weekMinutes}
          </Ring>
          <span className="muted small">Active min this week</span>
        </Link>
        <Link to="/sleep" className="card tile ringtile">
          <Ring value={sleptRecently ? Number(lastSleep.hours) : 0} max={sleepGoal} color="var(--c-purple)">
            {sleptRecently ? `${Number(lastSleep.hours)}h` : '—'}
          </Ring>
          <span className="muted small">Last night's sleep</span>
        </Link>
        <Link to="/mood" className="card tile ringtile">
          <span className="bigemoji">{lastMood ? MOOD_LABELS[lastMood.mood].emoji : '—'}</span>
          <span className="muted small">{lastMood ? `Last mood: ${MOOD_LABELS[lastMood.mood].label}` : 'No check-ins yet'}</span>
        </Link>
      </div>

      <p className="card tip">💡 {tipOfTheDay()}</p>

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
                  <span className={isDone(h.id, today) ? 'done' : ''}>
                    {h.icon && <span aria-hidden="true">{h.icon} </span>}
                    {h.name}
                  </span>
                  <span className="muted small">{streak(datesFor(h.id))}🔥</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {habits.length > 0 && doneToday === habits.length && <p className="good small">All done for today — nice work! 🎉</p>}
      </div>

      <div className="two-col">
        <WaterCard />
        <MoodForm compact onSaved={loadSummary} />
      </div>

      <div className="quicklinks">
        {!sleptRecently && (
          <Link to="/sleep" className="card quick">
            😴 Log last night's sleep
          </Link>
        )}
        <Link to="/fitness" className="card quick">
          🏃 Log a workout
        </Link>
        <Link to="/calm" className="card quick">
          🫁 Take a 1-minute breather
        </Link>
      </div>
    </section>
  )
}
