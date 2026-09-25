import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { MOOD_LABELS } from '../lib/types'

const TAGS = ['work', 'family', 'friends', 'exercise', 'sleep', 'health', 'stress', 'grateful', 'anxious', 'calm']

export default function MoodForm({ onSaved, compact = false }: { onSaved?: () => void; compact?: boolean }) {
  const [mood, setMood] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [note, setNote] = useState('')
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
    onSaved?.()
  }

  const toggleTag = (t: string) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

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
            {TAGS.map((t) => (
              <button type="button" key={t} className={`chip ${tags.includes(t) ? 'on' : ''}`} onClick={() => toggleTag(t)}>
                {t}
              </button>
            ))}
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
          .
        </p>
      )}
      {error && <p className="notice error">{error}</p>}
      <button disabled={!mood || saving}>{saving ? 'Saving…' : 'Save check-in'}</button>
    </form>
  )
}
