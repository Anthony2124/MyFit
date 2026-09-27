import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MOOD_LABELS } from '../lib/types'
import { useToast } from './Toast'

const TAGS = ['work', 'family', 'friends', 'exercise', 'sleep', 'health', 'stress', 'grateful', 'anxious', 'calm', 'outdoors', 'social']

const PROMPTS = [
  'What’s one thing that went well today?',
  'What’s taking up the most space in your mind?',
  'What are you grateful for right now?',
  'What would make tomorrow a little easier?',
  'What drained your energy today? What restored it?',
]

export default function MoodForm({ onSaved, compact = false, extraTags = [] }: { onSaved?: () => void; compact?: boolean; extraTags?: string[] }) {
  const toast = useToast()
  const [mood, setMood] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [custom, setCustom] = useState('')
  const [note, setNote] = useState('')
  const [prompt, setPrompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!mood) return
    setSaving(true)
    const { error } = await supabase.from('mood_entries').insert({ mood, energy, tags, note: note.trim() || null })
    setSaving(false)
    if (error) return setError(error.message)
    setMood(null)
    setEnergy(null)
    setTags([])
    setNote('')
    setError(null)
    toast('Check-in saved')
    onSaved?.()
  }

  const toggleTag = (t: string) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  function addCustom() {
    const t = custom.trim().toLowerCase().slice(0, 24)
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setCustom('')
  }

  const tagOptions = [...new Set([...TAGS, ...extraTags, ...tags])]

  return (
    <form onSubmit={save} className="card stack">
      <h2>How are you feeling?</h2>
      <div className="row mood-picker" role="radiogroup" aria-label="Mood">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            role="radio"
            aria-checked={mood === n}
            className={`mood ${mood === n ? 'selected' : ''}`}
            onClick={() => setMood(n)}
            title={MOOD_LABELS[n].label}
          >
            <span>{MOOD_LABELS[n].emoji}</span>
            <small>{MOOD_LABELS[n].label}</small>
          </button>
        ))}
      </div>

      {mood && !compact && (
        <>
          <label className="row small">
            Energy
            <input type="range" min={1} max={5} value={energy ?? 3} onChange={(e) => setEnergy(Number(e.target.value))} />
            <span className="muted">{energy ?? '—'}</span>
          </label>
          <div className="row wrap">
            {tagOptions.map((t) => (
              <button type="button" key={t} className={`chip ${tags.includes(t) ? 'on' : ''}`} onClick={() => toggleTag(t)}>
                {t}
              </button>
            ))}
            <input
              className="chip-input"
              placeholder="+ tag"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustom()
                }
              }}
              onBlur={addCustom}
              aria-label="Add a custom tag"
            />
          </div>
          <div className="row between small">
            <span className="muted">Prompt: {prompt}</span>
            <button type="button" className="link small" onClick={() => setPrompt(PROMPTS[(PROMPTS.indexOf(prompt) + 1) % PROMPTS.length])}>
              Another
            </button>
          </div>
          <textarea placeholder="Anything on your mind? (private)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={5000} rows={3} />
        </>
      )}

      {mood && mood <= 2 && (
        <p className="notice">
          Sorry today feels hard. If you need to talk to someone now, you can call or text <strong>988</strong> (US) or visit{' '}
          <a href="https://findahelpline.com" target="_blank" rel="noreferrer">
            findahelpline.com
          </a>
          . A <Link to="/calm">short breathing exercise</Link> might also help.
        </p>
      )}
      {error && <p className="notice error">{error}</p>}
      <button disabled={!mood || saving}>{saving ? 'Saving…' : 'Save check-in'}</button>
    </form>
  )
}
