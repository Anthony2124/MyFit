import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { isConfigured } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Habits from './pages/Habits'
import Mood from './pages/Mood'
import Sleep from './pages/Sleep'
import Settings from './pages/Settings'

function AppRoutes() {
  const { session, loading } = useAuth()
  if (loading) return <p className="center muted">Loading…</p>
  if (!session) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="habits" element={<Habits />} />
        <Route path="mood" element={<Mood />} />
        <Route path="sleep" element={<Sleep />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  if (!isConfigured) {
    return (
      <div className="card center narrow">
        <h1>Almost there</h1>
        <p>
          Copy <code>.env.example</code> to <code>.env.local</code>, add your Supabase URL and anon key, then restart{' '}
          <code>npm run dev</code>.
        </p>
      </div>
    )
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
