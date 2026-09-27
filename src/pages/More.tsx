import { Link } from 'react-router-dom'
import { NAV } from '../lib/nav'
import { supabase } from '../lib/supabase'

export default function More() {
  return (
    <section className="stack">
      <h1>More</h1>
      <div className="more-grid">
        {NAV.filter((l) => !l.primary).map((l) => (
          <Link key={l.to} to={l.to} className="card more-item">
            <span aria-hidden="true">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </div>
      <button className="ghost" onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>
    </section>
  )
}
