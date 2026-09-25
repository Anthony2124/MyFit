/** Local calendar date as YYYY-MM-DD (not UTC, so "today" matches the user's day). */
export function toDateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** The last `n` days as date keys, oldest first, ending today. */
export function lastNDays(n: number): string[] {
  const days: string[] = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d)
    x.setDate(d.getDate() - i)
    days.push(toDateKey(x))
  }
  return days
}

export function shortDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'narrow' })
}

/** Consecutive days (ending today or yesterday) present in the set. */
export function streak(dates: Set<string>): number {
  const d = new Date()
  if (!dates.has(toDateKey(d))) d.setDate(d.getDate() - 1)
  let count = 0
  while (dates.has(toDateKey(d))) {
    count++
    d.setDate(d.getDate() - 1)
  }
  return count
}

/** Date key for `n` days before today (1 = yesterday). */
export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toDateKey(d)
}
