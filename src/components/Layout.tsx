import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useInstallPrompt, useOnline } from '../lib/pwa'
import { useReminderScheduler } from '../lib/reminders'
import { NAV } from '../lib/nav'

export default function Layout() {
  const online = useOnline()
  const install = useInstallPrompt()
  const { pathname } = useLocation()
  useReminderScheduler()

  const inMore = NAV.some((l) => !l.primary && pathname.startsWith(l.to)) || pathname === '/more'

  return (
    <div className="app">
      <aside className="sidebar">
        <span className="brand">🌿 Steady</span>
        <nav>
          {NAV.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              <span aria-hidden="true">{l.icon}</span> {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          {install && (
            <button className="secondary" onClick={install}>
              ⬇ Install app
            </button>
          )}
          <button className="ghost" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="content">
        <header className="mobilebar">
          <span className="brand">🌿 Steady</span>
          {install && (
            <button className="secondary small" onClick={install}>
              Install
            </button>
          )}
        </header>
        {!online && <p className="notice offline">You're offline. Changes can't be saved until you reconnect.</p>}
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

      <nav className="tabbar" aria-label="Primary">
        {NAV.filter((l) => l.primary).map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}>
            <span aria-hidden="true">{l.icon}</span>
            <small>{l.label}</small>
          </NavLink>
        ))}
        <NavLink to="/more" className={inMore ? 'active' : undefined}>
          <span aria-hidden="true">☰</span>
          <small>More</small>
        </NavLink>
      </nav>
    </div>
  )
}
