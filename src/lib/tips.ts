// Short, general wellbeing prompts. Not medical advice.
export const TIPS = [
  'Small wins count. Doing a habit badly still beats skipping it.',
  'A 10-minute walk after meals can lift your energy and mood.',
  'Try keeping the same wake-up time, even on weekends.',
  'Before checking your phone, drink a glass of water.',
  'Name three things that went okay today — big or small.',
  'If a habit feels too hard, shrink it until it feels easy.',
  'Screens off 30 minutes before bed can help you fall asleep faster.',
  'Take four slow breaths: in for 4, hold for 4, out for 4, hold for 4.',
  'Reach out to one person today, even with a short message.',
  'Missed a day? Never miss twice — just pick back up.',
  'Morning daylight helps set your body clock. Step outside for a few minutes.',
  'Stretch for two minutes between long sitting sessions.',
  'Stack a new habit onto an existing one: "After I pour coffee, I…"',
  'Rest is part of progress. Recovery days matter.',
]

export function tipOfTheDay(): string {
  const start = new Date(new Date().getFullYear(), 0, 0)
  const day = Math.floor((Date.now() - start.getTime()) / 86_400_000)
  return TIPS[day % TIPS.length]
}
