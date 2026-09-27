import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { isConfigured } from './lib/supabase'
import { ProfileProvider } from './lib/profile'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import Login, { ResetPassword } from './pages/Login'
import Dashboard from './pages/Dashboard'

// Secondary pages are split out so the first load stays small.
const Habits = lazy(() => import('./pages/Habits'))
const Mood = lazy(() => import('./pages/Mood'))
const Sleep = lazy(() => import('./pages/Sleep'))
const Fitness = lazy(() => import('./pages/Fitness'))
const Insights = lazy(() => import('./pages/Insights'))
const Calm = lazy(() => import('./pages/Calm'))
const Settings = lazy(() => import('./pages/Settings'))
const More = lazy(() => import('./pages/More'))

function AppRoutes() {
  const { session, loading, recovering } = useAuth()
  if (loading) return <p className="center muted">Loading…</p>
  if (!session) return <Login />
  if (recovering) return <ResetPassword />

  return (
    <ProfileProvider userId={session.user.id}>
      <Suspense fallback={<p className="center muted">Loading…</p>}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="habits" element={<Habits />} />
            <Route path="mood" element={<Mood />} />
            <Route path="sleep" element={<Sleep />} />
            <Route path="fitness" element={<Fitness />} />
            <Route path="insights" element={<Insights />} />
            <Route path="calm" element={<Calm />} />
            <Route path="settings" element={<Settings />} />
            <Route path="more" element={<More />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </ProfileProvider>
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
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
