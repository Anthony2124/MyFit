import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) setMessage(error.message)
    else if (mode === 'signup') setMessage('Check your email to confirm your account, then sign in.')
  }

  return (
    <div className="card narrow center">
      <h1>🌿 Steady</h1>
      <p className="muted">Small daily habits, mood and sleep — private by default.</p>
      <form onSubmit={submit} className="stack">
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
        </label>
        {mode === 'signup' && (
          <label className="row small">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              I understand Steady stores the health and mood information I enter so I can track it. It's only visible to
              me, never sold or shared, and I can export or delete it at any time.
            </span>
          </label>
        )}
        <button disabled={busy || (mode === 'signup' && !consent)}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      {message && <p className="notice">{message}</p>}
      <button className="link" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
      </button>
    </div>
  )
}
