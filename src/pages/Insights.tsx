import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { daysAgo, lastNDays, longestStreak, parseKey, toDateKey } from '../lib/date'
import { useProfile } from '../lib/profile'
import { MOOD_LABELS, WEEKLY_ACTIVE_GOAL, type Habit, type HabitLog, type MoodEntry, type SleepLog, type WaterLog, type Workout } from '../lib/types'
import { BarChart, Heatmap } from '../components/Charts'

interface Data {
  habits: Habit[]
  habitLogs: HabitLog[]
  moods: MoodEntry[]
  sleep: SleepLog[]
  workouts: Workout[]
  water: WaterLog[]
  totalHabitLogs: number
  totalMoods: number
}

const WINDOW = 90

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const fmt = (v: number | null, digits = 1) => (v === null ? '—' : v.toFixed(digits))

function nextDay(key: string) {
  const d = parseKey(key)
  d.setDate(d.getDate() + 1)
  return toDateKey(d)
}

function Compare({ title, a, b, aLabel, bLabel }: { title: string; a: number[]; b: number[]; aLabel: string; bLabel: string }) {
  const ma = avg(a)
  const mb = avg(b)
  const enough = a.length >= 3 && b.length >= 3
  const diff = ma !== null && mb !== null ? ma - mb : 0
  return (
    <div className="compare">
      <h3>{title}</h3>
      {enough ? (
        <>
          <div className="compare-bars">
            <div>
              <span className="small">{aLabel}</span>
              <div className="meter">
                <div style={{ width: `${((ma ?? 0) / 5) * 100}%` }} />
              </div>
              <span className="small muted">
                {fmt(ma)} avg mood · {a.length} days
              </span>
            </div>
            <div>
              <span className="small">{bLabel}</span>
              <div className="meter muted-meter">
                <div style={{ width: `${((mb ?? 0) / 5) * 100}%` }} />
              </div>
              <span className="small muted">
                {fmt(mb)} avg mood · {b.length} days
              </span>
            </div>
          </div>
          <p className="small">
            {Math.abs(diff) < 0.2
              ? 'No clear difference so far.'
              : `Your mood tends to be ${diff > 0 ? 'higher' : 'lower'} by ${Math.abs(diff).toFixed(1)} points.`}
          </p>
        </>
      ) : (
        <p className="muted small">Need at least 3 days of each to compare. Keep logging!</p>
      )}
    </div>
  )
}

export default function Insights() {
  const { profile } = useProfile()
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const since = daysAgo(WINDOW)
    Promise.all([
      supabase.from('habits').select('*'),
      supabase.from('habit_logs').select('id, habit_id, log_date').gte('log_date', since),
      supabase.from('mood_entries').select('*').gte('created_at', parseKey(since).toISOString()),
      supabase.from('sleep_logs').select('*').gte('sleep_date', daysAgo(WINDOW + 1)),
      supabase.from('workouts').select('*').gte('workout_date', since),
      supabase.from('water_logs').select('id, log_date, glasses').gte('log_date', since),
      supabase.from('habit_logs').select('id', { count: 'exact', head: true }),
      supabase.from('mood_entries').select('id', { count: 'exact', head: true }),
    ]).then(([h, hl, m, s, w, wa, hc, mc]) => {
      const err = [h, hl, m, s, w, wa].find((r) => r.error)
      if (err) setError(err.error!.message)
      setData({
        habits: h.data ?? [],
        habitLogs: hl.data ?? [],
        moods: m.data ?? [],
        sleep: s.data ?? [],
        workouts: w.data ?? [],
        water: wa.data ?? [],
        totalHabitLogs: hc.count ?? 0,
        totalMoods: mc.count ?? 0,
      })
    })
  }, [])

  if (error) return <p className="notice error">{error}</p>
  if (!data) return <p className="muted">Crunching your numbers…</p>

  const waterGoal = profile?.water_goal ?? 8
  const sleepGoal = profile?.sleep_goal ?? 8
  const active = data.habits.filter((h) => !h.archived)

  // ---- Per-day aggregates ----
  const moodByDay = new Map<string, number[]>()
  for (const e of data.moods) {
    const k = toDateKey(new Date(e.created_at))
    moodByDay.set(k, [...(moodByDay.get(k) ?? []), e.mood])
  }
  const dayMood = (k: string) => avg(moodByDay.get(k) ?? [])

  const habitsDoneByDay = new Map<string, number>()
  for (const l of data.habitLogs) habitsDoneByDay.set(l.log_date, (habitsDoneByDay.get(l.log_date) ?? 0) + 1)

  const activeDays = new Set(data.workouts.map((w) => w.workout_date))
  const waterByDay = new Map(data.water.map((w) => [w.log_date, w.glasses]))
  const sleepByNight = new Map(data.sleep.map((s) => [s.sleep_date, s]))

  // ---- Week over week ----
  const thisWeek = lastNDays(7)
  const lastWeek = lastNDays(14).slice(0, 7)
  function summary(days: string[]) {
    const set = new Set(days)
    const possible = active.length * 7
    const done = data!.habitLogs.filter((l) => set.has(l.log_date) && active.some((h) => h.id === l.habit_id)).length
    const moods = days.flatMap((d) => moodByDay.get(d) ?? [])
    // Sleep for the night *before* each day.
    const sleeps = days.map((d) => sleepByNight.get(toDateKey(new Date(parseKey(d).getTime() - 86_400_000)))).filter(Boolean) as SleepLog[]
    return {
      habits: possible ? Math.round((done / possible) * 100) : null,
      mood: avg(moods),
      sleep: avg(sleeps.map((s) => Number(s.hours))),
      minutes: data!.workouts.filter((w) => set.has(w.workout_date)).reduce((s, w) => s + w.minutes, 0),
      water: avg(days.map((d) => waterByDay.get(d) ?? 0)),
    }
  }
  const cur = summary(thisWeek)
  const prev = summary(lastWeek)
  function delta(a: number | null, b: number | null, unit = '', digits = 1) {
    if (a === null || b === null) return null
    const d = a - b
    if (Math.abs(d) < 10 ** -digits) return <span className="muted small">no change</span>
    return (
      <span className={`small ${d > 0 ? 'up' : 'down'}`}>
        {d > 0 ? '▲' : '▼'} {Math.abs(d).toFixed(digits)}
        {unit}
      </span>
    )
  }

  // ---- Correlations (pattern-finding, not causation) ----
  const days = lastNDays(WINDOW).filter((d) => moodByDay.has(d))
  const afterGoodSleep: number[] = []
  const afterShortSleep: number[] = []
  for (const s of data.sleep) {
    const m = dayMood(nextDay(s.sleep_date))
    if (m === null) continue
    ;(Number(s.hours) >= sleepGoal - 0.5 ? afterGoodSleep : afterShortSleep).push(m)
  }
  const split = (pred: (d: string) => boolean) => [days.filter(pred).map((d) => dayMood(d)!), days.filter((d) => !pred(d)).map((d) => dayMood(d)!)]
  const [moodActive, moodInactive] = split((d) => activeDays.has(d))
  const [moodHydrated, moodDry] = split((d) => (waterByDay.get(d) ?? 0) >= waterGoal)
  const [moodHabits, moodNoHabits] = split((d) => active.length > 0 && (habitsDoneByDay.get(d) ?? 0) >= Math.ceil(active.length / 2))

  // ---- Tags ----
  const tagMoods = new Map<string, number[]>()
  for (const e of data.moods) for (const t of e.tags) tagMoods.set(t, [...(tagMoods.get(t) ?? []), e.mood])
  const tagRows = [...tagMoods.entries()]
    .filter(([, v]) => v.length >= 2)
    .map(([t, v]) => ({ tag: t, avg: avg(v)!, n: v.length }))
    .sort((a, b) => b.avg - a.avg)

  // ---- Weekday pattern ----
  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekday = weekdayNames.map((label, i) => {
    const vals = data.moods.filter((e) => (new Date(e.created_at).getDay() + 6) % 7 === i).map((e) => e.mood)
    const a = avg(vals)
    return { label, value: a === null ? null : Math.round(a * 10) / 10, title: `${label}: ${fmt(a)} (${vals.length} check-ins)` }
  })

  // ---- Consistency heatmap: share of active habits done each day ----
  const consistency = new Map<string, number>()
  if (active.length) for (const [d, n] of habitsDoneByDay) consistency.set(d, n / active.length)

  // ---- Achievements ----
  const allLogDates = new Set(data.habitLogs.map((l) => l.log_date))
  const bestHabitStreak = Math.max(0, ...active.map((h) => longestStreak(new Set(data.habitLogs.filter((l) => l.habit_id === h.id).map((l) => l.log_date)))))
  const totalMinutes = data.workouts.reduce((s, w) => s + w.minutes, 0)
  const waterGoalDays = [...waterByDay.values()].filter((g) => g >= waterGoal).length
  const badges = [
    { icon: '🌱', name: 'First step', desc: 'Log your first habit', got: data.totalHabitLogs >= 1 },
    { icon: '🔥', name: 'On a roll', desc: '7-day streak on any habit', got: bestHabitStreak >= 7 },
    { icon: '🏆', name: 'Unstoppable', desc: '30-day streak on any habit', got: bestHabitStreak >= 30 },
    { icon: '💯', name: 'Century', desc: '100 habit check-offs', got: data.totalHabitLogs >= 100 },
    { icon: '📓', name: 'Reflective', desc: '10 mood check-ins', got: data.totalMoods >= 10 },
    { icon: '🧠', name: 'Self-aware', desc: '50 mood check-ins', got: data.totalMoods >= 50 },
    { icon: '😴', name: 'Well rested', desc: '5 nights at your sleep goal', got: data.sleep.filter((s) => Number(s.hours) >= sleepGoal).length >= 5 },
    { icon: '💧', name: 'Hydrated', desc: 'Hit water goal 7 days', got: waterGoalDays >= 7 },
    { icon: '🏃', name: 'Mover', desc: 'Log 5 workouts', got: data.workouts.length >= 5 },
    { icon: '⚡', name: 'WHO-approved', desc: `${WEEKLY_ACTIVE_GOAL} active min in a week`, got: cur.minutes >= WEEKLY_ACTIVE_GOAL || prev.minutes >= WEEKLY_ACTIVE_GOAL },
    { icon: '🗓️', name: 'Regular', desc: 'Track habits on 30 different days', got: allLogDates.size >= 30 },
    { icon: '⛰️', name: 'Summit', desc: '1,000 active minutes (90 days)', got: totalMinutes >= 1000 },
  ]

  return (
    <section className="stack">
      <h1>Insights</h1>

      <div className="card stack">
        <h2>This week vs last week</h2>
        <div className="tiles">
          <div className="tile">
            <span className="muted small">Habit completion</span>
            <strong>{cur.habits === null ? '—' : `${cur.habits}%`}</strong>
            {delta(cur.habits, prev.habits, '%', 0)}
          </div>
          <div className="tile">
            <span className="muted small">Average mood</span>
            <strong>{fmt(cur.mood)}</strong>
            {delta(cur.mood, prev.mood)}
          </div>
          <div className="tile">
            <span className="muted small">Average sleep</span>
            <strong>{cur.sleep === null ? '—' : `${fmt(cur.sleep)} h`}</strong>
            {delta(cur.sleep, prev.sleep, ' h')}
          </div>
          <div className="tile">
            <span className="muted small">Active minutes</span>
            <strong>{cur.minutes}</strong>
            {delta(cur.minutes, prev.minutes, '', 0)}
          </div>
          <div className="tile">
            <span className="muted small">Water / day</span>
            <strong>{fmt(cur.water)}</strong>
            {delta(cur.water, prev.water)}
          </div>
        </div>
      </div>

      {active.length > 0 && (
        <div className="card stack">
          <h2>Habit consistency</h2>
          <Heatmap
            values={consistency}
            weeks={13}
            label="Share of habits completed each day over the last 13 weeks"
            describe={(k, v) => `${k}: ${Math.round(v * active.length)}/${active.length} habits`}
          />
        </div>
      )}

      <div className="card stack">
        <h2>What seems to affect your mood</h2>
        <p className="muted small">
          Patterns from the last {WINDOW} days. These are correlations in your own data, not proof of cause — but they can hint at what helps.
        </p>
        <div className="compare-grid">
          <Compare title="😴 Sleep" a={afterGoodSleep} b={afterShortSleep} aLabel={`After ~${sleepGoal}h+ sleep`} bLabel="After short sleep" />
          <Compare title="🏃 Exercise" a={moodActive} b={moodInactive} aLabel="Days you worked out" bLabel="Days you didn't" />
          <Compare title="💧 Water" a={moodHydrated} b={moodDry} aLabel="Hit water goal" bLabel="Below water goal" />
          <Compare title="✅ Habits" a={moodHabits} b={moodNoHabits} aLabel="Did half+ of habits" bLabel="Did fewer" />
        </div>
      </div>

      {data.moods.length >= 5 && (
        <div className="card stack">
          <h2>Mood by day of week</h2>
          <BarChart points={weekday} label="Average mood by day of week" color="var(--accent)" />
        </div>
      )}

      {tagRows.length > 0 && (
        <div className="card stack">
          <h2>Mood by tag</h2>
          <ul className="list stack">
            {tagRows.map((r) => (
              <li key={r.tag} className="tagrow">
                <span className="chip">{r.tag}</span>
                <div className="meter">
                  <div style={{ width: `${(r.avg / 5) * 100}%` }} />
                </div>
                <span className="small nowrap">
                  {MOOD_LABELS[Math.round(r.avg)].emoji} {r.avg.toFixed(1)} <span className="muted">({r.n})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card stack">
        <h2>Achievements</h2>
        <div className="badges">
          {badges.map((b) => (
            <div key={b.name} className={`badge ${b.got ? 'got' : ''}`} title={b.desc}>
              <span className="badge-icon" aria-hidden="true">
                {b.icon}
              </span>
              <strong className="small">{b.name}</strong>
              <span className="muted small">{b.desc}</span>
              <span className="sr-only">{b.got ? 'Earned' : 'Not yet earned'}</span>
            </div>
          ))}
        </div>
        <p className="muted small">
          {badges.filter((b) => b.got).length} of {badges.length} earned
        </p>
      </div>
    </section>
  )
}
