import type { ReactNode } from 'react'
import { parseKey, prettyDate, toDateKey } from '../lib/date'

export interface Point {
  label: string
  value: number | null
  title?: string
}

const W = 600
const PAD = { top: 12, right: 12, bottom: 22, left: 34 }

function scale(min: number, max: number, height: number) {
  const span = max - min || 1
  return (v: number) => PAD.top + (1 - (v - min) / span) * (height - PAD.top - PAD.bottom)
}

function ticks(min: number, max: number): number[] {
  const step = (max - min) / 3
  return [0, 1, 2, 3].map((i) => Math.round((min + step * i) * 10) / 10)
}

/** Every nth label so the x-axis doesn't crowd. */
function showLabel(i: number, n: number) {
  const every = Math.ceil(n / 7)
  return i % every === 0 || i === n - 1
}

export function LineChart({
  points,
  min,
  max,
  height = 180,
  color = 'var(--accent)',
  label,
  format = (v: number) => String(v),
}: {
  points: Point[]
  min?: number
  max?: number
  height?: number
  color?: string
  label: string
  format?: (v: number) => string
}) {
  const values = points.map((p) => p.value).filter((v): v is number => v !== null)
  if (values.length === 0) return <p className="muted small">Not enough data yet.</p>
  const lo = min ?? Math.floor(Math.min(...values) - 1)
  const hi = max ?? Math.ceil(Math.max(...values) + 1)
  const y = scale(lo, hi, height)
  const step = (W - PAD.left - PAD.right) / Math.max(points.length - 1, 1)
  const x = (i: number) => PAD.left + i * step

  // Break the line at gaps (null values) rather than drawing across them.
  let d = ''
  let pen = false
  points.forEach((p, i) => {
    if (p.value === null) return void (pen = false)
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)} `
    pen = true
  })

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label}>
      {ticks(lo, hi).map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="gridline" />
          <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" className="axis">
            {format(t)}
          </text>
        </g>
      ))}
      <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) =>
        p.value === null ? null : (
          <circle key={i} cx={x(i)} cy={y(p.value)} r={3.5} fill={color}>
            <title>{p.title ?? `${p.label}: ${format(p.value)}`}</title>
          </circle>
        ),
      )}
      {points.map((p, i) =>
        showLabel(i, points.length) ? (
          <text key={`l${i}`} x={x(i)} y={height - 6} textAnchor="middle" className="axis">
            {p.label}
          </text>
        ) : null,
      )}
    </svg>
  )
}

export function BarChart({
  points,
  goal,
  height = 180,
  color = 'var(--accent)',
  label,
  format = (v: number) => String(v),
}: {
  points: Point[]
  goal?: number
  height?: number
  color?: string
  label: string
  format?: (v: number) => string
}) {
  const hi = Math.max(goal ?? 0, ...points.map((p) => p.value ?? 0), 1) * 1.1
  const y = scale(0, hi, height)
  const slot = (W - PAD.left - PAD.right) / points.length
  const bw = Math.min(slot * 0.7, 40)

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label}>
      {ticks(0, hi).map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="gridline" />
          <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" className="axis">
            {format(Math.round(t))}
          </text>
        </g>
      ))}
      {points.map((p, i) => {
        const cx = PAD.left + slot * i + slot / 2
        const v = p.value ?? 0
        return (
          <g key={i}>
            {v > 0 && (
              <rect x={cx - bw / 2} y={y(v)} width={bw} height={y(0) - y(v)} rx={3} fill={color} opacity={goal && v < goal ? 0.55 : 0.9}>
                <title>{p.title ?? `${p.label}: ${format(v)}`}</title>
              </rect>
            )}
            {showLabel(i, points.length) && (
              <text x={cx} y={height - 6} textAnchor="middle" className="axis">
                {p.label}
              </text>
            )}
          </g>
        )
      })}
      {goal !== undefined && (
        <line x1={PAD.left} x2={W - PAD.right} y1={y(goal)} y2={y(goal)} className="goalline">
          <title>Goal: {format(goal)}</title>
        </line>
      )}
    </svg>
  )
}

/**
 * GitHub-style calendar: one column per week, Monday at top.
 * `values` maps date keys to 0–1 intensity.
 */
export function Heatmap({
  values,
  weeks = 12,
  color = 'var(--accent)',
  label,
  describe = (key: string, v: number) => `${prettyDate(key)}: ${Math.round(v * 100)}%`,
}: {
  values: Map<string, number>
  weeks?: number
  color?: string
  label: string
  describe?: (key: string, v: number) => string
}) {
  const today = new Date()
  const end = new Date(today)
  end.setDate(today.getDate() + (6 - ((today.getDay() + 6) % 7))) // Sunday of this week
  const start = new Date(end)
  start.setDate(end.getDate() - weeks * 7 + 1)
  const todayKey = toDateKey(today)

  const cells = []
  const size = 14
  const gap = 3
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = toDateKey(d)
    if (key > todayKey) continue
    const v = values.get(key) ?? 0
    cells.push(
      <rect
        key={key}
        x={Math.floor(i / 7) * (size + gap)}
        y={(i % 7) * (size + gap)}
        width={size}
        height={size}
        rx={3}
        fill={v > 0 ? color : 'var(--border)'}
        opacity={v > 0 ? 0.3 + 0.7 * Math.min(v, 1) : 1}
      >
        <title>{describe(key, v)}</title>
      </rect>,
    )
  }
  const firstMonth = parseKey(toDateKey(start)).toLocaleDateString(undefined, { month: 'short' })

  return (
    <div className="heatmap">
      <svg viewBox={`0 0 ${weeks * (size + gap)} ${7 * (size + gap)}`} role="img" aria-label={label}>
        {cells}
      </svg>
      <div className="row between muted small">
        <span>{firstMonth}</span>
        <span>Today</span>
      </div>
    </div>
  )
}

/** Circular progress ring. */
export function Ring({ value, max, size = 64, color = 'var(--accent)', children }: { value: number; max: number; size?: number; color?: string; children?: ReactNode }) {
  const r = size / 2 - 5
  const c = 2 * Math.PI * r
  const pct = Math.min(value / (max || 1), 1)
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  )
}
