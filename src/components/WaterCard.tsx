import { useProfile } from '../lib/profile'
import { useWater } from '../lib/useWater'
import { toDateKey } from '../lib/date'

export default function WaterCard() {
  const { profile } = useProfile()
  const { glassesOn, setGlasses, error } = useWater(1)
  const goal = profile?.water_goal ?? 8
  const today = glassesOn(toDateKey())

  return (
    <div className="card stack">
      <div className="row between">
        <h2>💧 Water</h2>
        <span className={today >= goal ? 'good' : 'muted'}>
          {today}/{goal} glasses
        </span>
      </div>
      <div className="glasses" aria-label={`${today} of ${goal} glasses`}>
        {Array.from({ length: Math.max(goal, today) }, (_, i) => (
          <button
            key={i}
            className={`glass ${i < today ? 'full' : ''}`}
            aria-label={`Set to ${i + 1} glasses`}
            onClick={() => setGlasses(i + 1 === today ? i : i + 1)}
          />
        ))}
      </div>
      <div className="row">
        <button className="secondary" onClick={() => setGlasses(today - 1)} disabled={today === 0} aria-label="Remove a glass">
          −
        </button>
        <button onClick={() => setGlasses(today + 1)}>+ Glass</button>
        {today >= goal && <span className="small good">Goal reached 🎉</span>}
      </div>
      {error && <p className="notice error">{error}</p>}
    </div>
  )
}
