import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const links = [
  { to: '/', label: 'Today', end: true },
  { to: '/habits', label: 'Habits' },
  { to: '/mood', label: 'Mood' },
  { to: '/sleep', label: 'Sleep' },
  { to: '/settings', label: 'Settings' },
]

export default function Layout() {
  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">🌿 Steady</span>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button className="ghost" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="support">
        Steady is a self-tracking tool, not medical care. If you're in crisis, call or text <strong>988</strong>{' '}
        (US Suicide &amp; Crisis Lifeline), or find a helpline at{' '}
        <a href="https://findahelpline.com" target="_blank" rel="noreferrer">
          findahelpline.com
        </a>
        . In an emergency, call your local emergency number.
      </footer>
    </div>
  )
}
