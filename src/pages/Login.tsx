import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

type Mode = 'signin' | 'signup' | 'forgot'

export default function Login() {
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      setBusy(false)
      return setMessage(error ? error.message : 'If that email has an account, a reset link is on its way.')
    }
    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: name.trim() ? { display_name: name.trim() } : undefined } })
    setBusy(false)
    if (error) setMessage(error.message)
    else if (mode === 'signup') setMessage('Check your email to confirm your account, then sign in.')
  }

  const switchTo = (m: Mode) => {
    setMode(m)
    setMessage(null)
  }

  return (
    <div className="card narrow center login">
      <div className="logo" aria-hidden="true">
        🌿
      </div>
      <h1>Steady</h1>
      <p className="muted">Habits, mood, sleep &amp; fitness — private by default.</p>
      <form onSubmit={submit} className="stack">
        {mode === 'signup' && (
          <label>
            Name (optional)
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="given-name" />
          </label>
        )}
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        {mode !== 'forgot' && (
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
        )}
        {mode === 'signup' && (
          <label className="row small">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              I understand Steady stores the health and mood information I enter so I can track it. It's only visible to me, never sold or shared,
              and I can export or delete it at any time.
            </span>
          </label>
        )}
        <button disabled={busy || (mode === 'signup' && !consent)}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
        </button>
      </form>
      {message && <p className="notice">{message}</p>}
      <div className="stack login-links">
        {mode === 'signin' && (
          <button className="link" onClick={() => switchTo('forgot')}>
            Forgot password?
          </button>
        )}
        <button className="link" onClick={() => switchTo(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'New here? Create an account' : 'Back to sign in'}
        </button>
      </div>
    </div>
  )
}

export function ResetPassword() {
  const { finishRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return setMessage(error.message)
    finishRecovery()
  }

  return (
    <div className="card narrow center">
      <h1>Choose a new password</h1>
      <form onSubmit={submit} className="stack">
        <label>
          New password
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </label>
        <button>Save password</button>
      </form>
      {message && <p className="notice error">{message}</p>}
    </div>
  )
}
