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

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** e.g. "Mon, Sep 28" */
export function prettyDate(key: string): string {
  return parseKey(key).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/** Longest run of consecutive days anywhere in the set. */
export function longestStreak(dates: Set<string>): number {
  let best = 0
  for (const key of dates) {
    const prev = parseKey(key)
    prev.setDate(prev.getDate() - 1)
    if (dates.has(toDateKey(prev))) continue // not the start of a run
    let len = 0
    const d = parseKey(key)
    while (dates.has(toDateKey(d))) {
      len++
      d.setDate(d.getDate() + 1)
    }
    best = Math.max(best, len)
  }
  return best
}

/** Date key of the Monday starting the week that contains `key`. */
export function weekStart(key: string = toDateKey()): string {
  const d = parseKey(key)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return toDateKey(d)
}

/** Hours between a bedtime and wake time given as "HH:MM", wrapping past midnight. */
export function hoursBetween(bed: string, wake: string): number {
  const [bh, bm] = bed.split(':').map(Number)
  const [wh, wm] = wake.split(':').map(Number)
  let mins = wh * 60 + wm - (bh * 60 + bm)
  if (mins <= 0) mins += 24 * 60
  return Math.round((mins / 60) * 4) / 4
}
