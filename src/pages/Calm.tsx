import { useEffect, useRef, useState } from 'react'

interface Phase {
  label: string
  seconds: number
  scale: number // circle size at the end of this phase
}

const PATTERNS: Record<string, { name: string; desc: string; phases: Phase[] }> = {
  box: {
    name: 'Box breathing',
    desc: 'Equal counts in, hold, out, hold. Steadying and simple.',
    phases: [
      { label: 'Breathe in', seconds: 4, scale: 1 },
      { label: 'Hold', seconds: 4, scale: 1 },
      { label: 'Breathe out', seconds: 4, scale: 0.55 },
      { label: 'Hold', seconds: 4, scale: 0.55 },
    ],
  },
  relax: {
    name: '4-7-8',
    desc: 'A long exhale that many people find helps them wind down for sleep.',
    phases: [
      { label: 'Breathe in', seconds: 4, scale: 1 },
      { label: 'Hold', seconds: 7, scale: 1 },
      { label: 'Breathe out', seconds: 8, scale: 0.55 },
    ],
  },
  coherent: {
    name: 'Slow & even',
    desc: 'About six breaths a minute, no holds.',
    phases: [
      { label: 'Breathe in', seconds: 5, scale: 1 },
      { label: 'Breathe out', seconds: 5, scale: 0.55 },
    ],
  },
}

function chime(ctx: AudioContext | null) {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = 528
  gain.gain.setValueAtTime(0.0001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.5)
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 2.6)
}

function Breathing() {
  const [pattern, setPattern] = useState<keyof typeof PATTERNS>('box')
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const phases = PATTERNS[pattern].phases

  // Derive the current phase from seconds elapsed.
  const cycleLen = phases.reduce((s, p) => s + p.seconds, 0)
  const cycles = Math.floor(elapsed / cycleLen)
  let pos = elapsed % cycleLen
  let phaseIdx = 0
  while (pos >= phases[phaseIdx].seconds) pos -= phases[phaseIdx++].seconds
  const phase = phases[phaseIdx]
  const count = pos

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setElapsed((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [running])

  function toggle() {
    setElapsed(0)
    setRunning(!running)
  }

  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div className="card stack">
      <div className="row wrap">
        {Object.entries(PATTERNS).map(([k, p]) => (
          <button
            key={k}
            className={`chip ${pattern === k ? 'on' : ''}`}
            onClick={() => {
              setPattern(k)
              setRunning(false)
              setElapsed(0)
            }}
          >
            {p.name}
          </button>
        ))}
      </div>
      <p className="muted small">{PATTERNS[pattern].desc}</p>
      <div className="breath-stage">
        <div
          className="breath-circle"
          style={{
            transform: `scale(${running ? phase.scale : 0.55})`,
            transitionDuration: running && !reduceMotion ? `${phase.seconds}s` : '0.3s',
          }}
        />
        <div className="breath-text" aria-live="polite">
          {running ? (
            <>
              <strong>{phase.label}</strong>
              <span>{phase.seconds - count}</span>
            </>
          ) : (
            <span className="muted">Ready when you are</span>
          )}
        </div>
      </div>
      <div className="row between">
        <span className="muted small">{cycles > 0 && `${cycles} round${cycles > 1 ? 's' : ''} completed`}</span>
        <button onClick={toggle}>{running ? 'Stop' : 'Start'}</button>
      </div>
      <p className="muted small">If you feel lightheaded, stop and breathe normally.</p>
    </div>
  )
}

function Timer() {
  const [minutes, setMinutes] = useState(5)
  const [left, setLeft] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const audio = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (left === null || paused) return
    if (left <= 0) {
      chime(audio.current)
      setLeft(null)
      return
    }
    const id = setTimeout(() => setLeft(left - 1), 1000)
    return () => clearTimeout(id)
  }, [left, paused])

  function start() {
    // Audio must be unlocked by a user gesture.
    audio.current ??= new AudioContext()
    chime(audio.current)
    setPaused(false)
    setLeft(minutes * 60)
  }

  const mm = left === null ? minutes : Math.floor(left / 60)
  const ss = left === null ? 0 : left % 60

  return (
    <div className="card stack">
      <h2>Meditation timer</h2>
      <div className="timer-display" aria-live="off">
        {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
      </div>
      {left === null ? (
        <>
          <div className="row wrap">
            {[1, 3, 5, 10, 15, 20].map((m) => (
              <button key={m} className={`chip ${minutes === m ? 'on' : ''}`} onClick={() => setMinutes(m)}>
                {m} min
              </button>
            ))}
          </div>
          <button onClick={start}>Begin</button>
        </>
      ) : (
        <div className="row">
          <button className="secondary" onClick={() => setPaused(!paused)}>
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button className="ghost" onClick={() => setLeft(null)}>
            End
          </button>
        </div>
      )}
      <p className="muted small">A soft chime marks the start and end.</p>
    </div>
  )
}

function Grounding() {
  const steps = [
    ['👀', '5 things you can see'],
    ['✋', '4 things you can touch'],
    ['👂', '3 things you can hear'],
    ['👃', '2 things you can smell'],
    ['👅', '1 thing you can taste'],
  ]
  const [step, setStep] = useState(0)
  return (
    <div className="card stack">
      <h2>5-4-3-2-1 grounding</h2>
      <p className="muted small">When your mind is racing, bring attention back to your senses. Take your time with each step.</p>
      {step < steps.length ? (
        <>
          <p className="grounding-step">
            <span aria-hidden="true">{steps[step][0]}</span> Notice <strong>{steps[step][1]}</strong>
          </p>
          <div className="row">
            <button onClick={() => setStep(step + 1)}>Done</button>
            <span className="muted small">
              Step {step + 1} of {steps.length}
            </span>
          </div>
        </>
      ) : (
        <>
          <p>Well done. Take one more slow breath before moving on. 🌿</p>
          <button className="secondary" onClick={() => setStep(0)}>
            Start again
          </button>
        </>
      )}
    </div>
  )
}

export default function Calm() {
  return (
    <section className="stack">
      <h1>Calm</h1>
      <Breathing />
      <div className="two-col">
        <Timer />
        <Grounding />
      </div>
    </section>
  )
}
