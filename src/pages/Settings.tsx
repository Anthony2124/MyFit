import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

export default function Settings() {
  const { session } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('display_name')
      .maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name ?? ''))
  }, [])

  async function saveProfile() {
    const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('id', session!.user.id)
    setStatus(error ? error.message : 'Saved.')
  }

  // Data portability: download everything we hold about the user as JSON.
  async function exportData() {
    const tables = ['profiles', 'habits', 'habit_logs', 'mood_entries', 'sleep_logs'] as const
    const results = await Promise.all(tables.map((t) => supabase.from(t).select('*')))
    const failed = results.find((r) => r.error)
    if (failed) return setStatus(failed.error!.message)

    const payload = Object.fromEntries(tables.map((t, i) => [t, results[i].data]))
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), email: session?.user.email, ...payload }, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `steady-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function deleteAccount() {
    const { error } = await supabase.rpc('delete_my_account')
    if (error) return setStatus(error.message)
    await supabase.auth.signOut()
  }

  return (
    <section className="stack">
      <h1>Settings</h1>
      {status && <p className="notice">{status}</p>}

      <div className="card stack">
        <h2>Profile</h2>
        <p className="muted small">Signed in as {session?.user.email}</p>
        <label>
          Display name
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} />
        </label>
        <button onClick={saveProfile}>Save</button>
      </div>

      <div className="card stack">
        <h2>Your data</h2>
        <p className="small">
          Your entries are protected by row-level security: only your signed-in account can read them. We don't sell your
          data or use third-party analytics.
        </p>
        <button className="secondary" onClick={exportData}>
          Download all my data (JSON)
        </button>
      </div>

      <div className="card stack danger">
        <h2>Delete account</h2>
        <p className="small">
          This permanently deletes your account and every habit, mood entry and sleep log. It can't be undone — consider
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
