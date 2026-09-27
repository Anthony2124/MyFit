import { useEffect } from 'react'
import { toDateKey } from './date'

export interface Reminder {
  id: string
  label: string
  time: string // "HH:MM"
  enabled: boolean
}

const KEY = 'steady-reminders'
const FIRED_KEY = 'steady-reminders-fired'

export const DEFAULT_REMINDERS: Reminder[] = [
  { id: 'habits', label: 'Check off your habits', time: '20:00', enabled: false },
  { id: 'mood', label: 'How are you feeling? Log a mood check-in', time: '13:00', enabled: false },
  { id: 'sleep', label: 'Log last night’s sleep', time: '08:30', enabled: false },
  { id: 'water', label: 'Time for a glass of water 💧', time: '11:00', enabled: false },
  { id: 'winddown', label: 'Start winding down for bed 🌙', time: '22:00', enabled: false },
]

// Reminders live on this device (not in the database): notification permission is per-device anyway.
export function loadReminders(): Reminder[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Reminder[] | null
    if (!saved) return DEFAULT_REMINDERS
    return DEFAULT_REMINDERS.map((d) => saved.find((s) => s.id === d.id) ?? d)
  } catch {
    return DEFAULT_REMINDERS
  }
}

export function saveReminders(r: Reminder[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r))
  } catch {
    // ignore
  }
}

function firedToday(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) ?? '{}')
  } catch {
    return {}
  }
}

async function show(body: string) {
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
  if (reg) reg.showNotification('Steady', { body, icon: '/icon-192.png', badge: '/icon-192.png', tag: body })
  else new Notification('Steady', { body, icon: '/icon-192.png' })
}

/**
 * Checks once a minute while the app is open (or installed and running in the background)
 * and fires each enabled reminder at most once per day.
 */
export function useReminderScheduler() {
  useEffect(() => {
    if (!('Notification' in window)) return
    function tick() {
      if (Notification.permission !== 'granted') return
      const now = new Date()
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const today = toDateKey(now)
      const fired = firedToday()
      for (const r of loadReminders()) {
        if (r.enabled && r.time <= hhmm && fired[r.id] !== today) {
          // Don't fire stale reminders from hours ago when the app is first opened.
          const [h, m] = r.time.split(':').map(Number)
          if (now.getHours() * 60 + now.getMinutes() - (h * 60 + m) <= 30) show(r.label)
          fired[r.id] = today
        }
      }
      try {
        localStorage.setItem(FIRED_KEY, JSON.stringify(fired))
      } catch {
        // ignore
      }
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])
}
