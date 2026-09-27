import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useProfile } from '../lib/profile'
import { getTheme, setTheme, type Theme } from '../lib/theme'
import { isStandalone, useInstallPrompt } from '../lib/pwa'
import { loadReminders, saveReminders, type Reminder } from '../lib/reminders'
import { useToast } from '../components/Toast'

const TABLES = ['profiles', 'habits', 'habit_logs', 'mood_entries', 'sleep_logs', 'workouts', 'body_metrics', 'water_logs'] as const

function download(filename: string, content: string, type: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : Array.isArray(v) ? v.join(';') : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n')
}

export default function Settings() {
  const { session } = useAuth()
  const { profile, update } = useProfile()
  const toast = useToast()
  const install = useInstallPrompt()
  const [displayName, setDisplayName] = useState('')
  const [waterGoal, setWaterGoal] = useState(8)
  const [sleepGoal, setSleepGoal] = useState(8)
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg')
  const [theme, setThemeState] = useState<Theme>(getTheme())
  const [reminders, setReminders] = useState<Reminder[]>(loadReminders)
  const [permission, setPermission] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const [csvTable, setCsvTable] = useState<(typeof TABLES)[number]>('habit_logs')
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.display_name ?? '')
    setWaterGoal(profile.water_goal)
    setSleepGoal(Number(profile.sleep_goal))
    setUnit(profile.weight_unit)
  }, [profile])

  async function saveProfile() {
    const err = await update({ display_name: displayName.trim() || null, water_goal: waterGoal, sleep_goal: sleepGoal, weight_unit: unit })
    toast(err ?? 'Saved', err ? 'error' : 'info')
  }

  function chooseTheme(t: Theme) {
    setTheme(t)
    setThemeState(t)
  }

  async function enableNotifications() {
    const p = await Notification.requestPermission()
    setPermission(p)
    if (p === 'granted') toast('Notifications enabled')
  }

  function updateReminder(id: string, patch: Partial<Reminder>) {
    const next = reminders.map((r) => (r.id === id ? { ...r, ...patch } : r))
    setReminders(next)
    saveReminders(next)
  }

  // Data portability: download everything we hold about the user as JSON.
  async function exportData() {
    const results = await Promise.all(TABLES.map((t) => supabase.from(t).select('*')))
    const failed = results.find((r) => r.error)
    if (failed) return toast(failed.error!.message, 'error')
    const payload = Object.fromEntries(TABLES.map((t, i) => [t, results[i].data]))
    download(
      `steady-export-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ exported_at: new Date().toISOString(), email: session?.user.email, ...payload }, null, 2),
      'application/json',
    )
  }

  async function exportCsv() {
    const { data, error } = await supabase.from(csvTable).select('*')
    if (error) return toast(error.message, 'error')
    if (!data?.length) return toast('Nothing to export in that table yet')
    download(`steady-${csvTable}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(data), 'text/csv')
  }

  async function deleteAccount() {
    const { error } = await supabase.rpc('delete_my_account')
    if (error) return toast(error.message, 'error')
    await supabase.auth.signOut()
  }

  return (
    <section className="stack">
      <h1>Settings</h1>

      <div className="card stack">
        <h2>Profile &amp; goals</h2>
        <p className="muted small">Signed in as {session?.user.email}</p>
        <label>
          Display name
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} />
        </label>
        <div className="row wrap">
          <label>
            Daily water goal (glasses)
            <input type="number" min={1} max={30} value={waterGoal} onChange={(e) => setWaterGoal(Number(e.target.value))} />
          </label>
          <label>
            Nightly sleep goal (hours)
            <input type="number" min={3} max={14} step={0.5} value={sleepGoal} onChange={(e) => setSleepGoal(Number(e.target.value))} />
          </label>
          <label>
            Weight unit
            <select value={unit} onChange={(e) => setUnit(e.target.value as 'kg' | 'lb')}>
              <option value="kg">Kilograms (kg)</option>
              <option value="lb">Pounds (lb)</option>
            </select>
          </label>
        </div>
        <button onClick={saveProfile}>Save</button>
      </div>

      <div className="card stack">
        <h2>Appearance</h2>
        <div className="segmented" role="radiogroup" aria-label="Theme">
          {(['system', 'light', 'dark'] as Theme[]).map((t) => (
            <button key={t} role="radio" aria-checked={theme === t} className={theme === t ? 'on' : ''} onClick={() => chooseTheme(t)}>
              {t === 'system' ? '🖥 System' : t === 'light' ? '☀️ Light' : '🌙 Dark'}
            </button>
          ))}
        </div>
      </div>

      <div className="card stack">
        <h2>App</h2>
        {isStandalone() ? (
          <p className="small">✅ Steady is installed on this device.</p>
        ) : install ? (
          <>
            <p className="small">Install Steady for a full-screen app with its own icon, quick launch, and offline start-up.</p>
            <button onClick={install}>⬇ Install Steady</button>
          </>
        ) : (
          <p className="small muted">
            To install: in Chrome or Edge use the install icon in the address bar; on iPhone/iPad tap <strong>Share → Add to Home Screen</strong>.
          </p>
        )}
      </div>

      <div className="card stack">
        <h2>Reminders</h2>
        <p className="muted small">
          Reminders are stored on this device only. They appear while Steady is open or running as an installed app.
        </p>
        {permission === 'unsupported' ? (
          <p className="notice">This browser doesn't support notifications.</p>
        ) : permission !== 'granted' ? (
          <button className="secondary" onClick={enableNotifications} disabled={permission === 'denied'}>
            {permission === 'denied' ? 'Notifications blocked in browser settings' : 'Allow notifications'}
          </button>
        ) : null}
        <ul className="list stack">
          {reminders.map((r) => (
            <li key={r.id} className="row between wrap">
              <label className="row small grow">
                <input type="checkbox" checked={r.enabled} onChange={(e) => updateReminder(r.id, { enabled: e.target.checked })} disabled={permission !== 'granted'} />
                {r.label}
              </label>
              <input type="time" value={r.time} onChange={(e) => updateReminder(r.id, { time: e.target.value })} aria-label={`${r.label} time`} />
            </li>
          ))}
        </ul>
      </div>

      <div className="card stack">
        <h2>Your data</h2>
        <p className="small">
          Your entries are protected by row-level security: only your signed-in account can read them. We don't sell your data or use third-party
          analytics. The app's offline cache never stores your entries.
        </p>
        <button className="secondary" onClick={exportData}>
          Download all my data (JSON)
        </button>
        <div className="row wrap">
          <select value={csvTable} onChange={(e) => setCsvTable(e.target.value as (typeof TABLES)[number])} aria-label="Table to export">
            {TABLES.filter((t) => t !== 'profiles').map((t) => (
              <option key={t} value={t}>
                {t.replace('_', ' ')}
              </option>
            ))}
          </select>
          <button className="secondary" onClick={exportCsv}>
            Download as CSV (for spreadsheets)
          </button>
        </div>
      </div>

      <div className="card stack danger">
        <h2>Delete account</h2>
        <p className="small">
          This permanently deletes your account and every habit, mood entry, sleep log, workout and weight entry. It can't be undone — consider
          downloading your data first. Type <strong>DELETE</strong> to confirm.
        </p>
        <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
        <button className="danger" disabled={confirmText !== 'DELETE'} onClick={deleteAccount}>
          Permanently delete my account
        </button>
      </div>
    </section>
  )
}
