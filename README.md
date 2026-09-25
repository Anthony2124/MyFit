# Steady — habits, mood & sleep

A React + Supabase wellness tracker: daily habit check-offs with streaks, a private mood journal,
and a sleep log. Built privacy-first because it stores health and mental-health data.

**Stack:** React 19 · TypeScript · Vite · React Router · Supabase (Postgres, Auth, RLS)

## Setup

1. **Create a Supabase project** at <https://supabase.com/dashboard>.
2. **Create the schema:** in the dashboard open **SQL Editor**, paste
   `supabase/migrations/0001_init.sql`, and run it.
   (With the Supabase CLI instead: `supabase link` then `supabase db push`.)
3. **Configure env:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from **Project Settings → API**.
4. **Run:**
   ```bash
   npm install
   npm run dev
   ```
   Open <http://localhost:5173>, create an account, confirm your email, and sign in.

## Features

| Page     | What it does |
|----------|--------------|
| Today    | Greeting, summary tiles, today's habit checklist, quick mood check-in, sleep reminder |
| Habits   | Create habits with a weekly goal and color, 7-day tap grid, weekly progress, streaks, archive |
| Mood     | 1–5 mood + energy, tags, private notes, recent-trend chart, history |
| Sleep    | Log hours and quality per night (re-logging a night updates it), 7-night average |
| Settings | Display name, **export all data as JSON**, **permanent account deletion** |

## Privacy & safety design

- **Row-level security on every table.** Policies restrict every row to `auth.uid()`, so the
  public anon key can't read anyone else's data. Habit logs can only reference habits you own.
- **Explicit consent at sign-up** describing what's stored.
- **Data portability:** one-click JSON export of everything tied to the account.
- **Right to erasure:** `delete_my_account()` removes the auth user; all data cascades.
- **No third-party analytics or trackers** are included.
- **Crisis resources:** a persistent footer, plus a gentle prompt when a user logs a low mood,
  point to 988 / findahelpline.com. The app states it is not medical care.

### Before launching to real users

- If you handle data on behalf of US healthcare providers you may need **HIPAA** compliance —
  Supabase offers a BAA on its Team/Enterprise plans. In the EU/UK, health data is GDPR
  "special category" data, which needs explicit consent and a privacy policy.
- Turn on **email confirmation** and consider **MFA** in Supabase Auth settings.
- Write a privacy policy and terms of service. The consent text in `Login.tsx` is only a placeholder.

## Ideas for reducing churn

Consumer health apps lose users fast, so these are good next steps:
reminder push/email notifications, weekly insight emails ("you sleep 40 min longer on days you walk"),
gentle streak recovery (freeze days rather than resetting to zero), onboarding goal templates,
and a paid tier (Stripe) for insights and correlations.

## Project layout

```
supabase/migrations/0001_init.sql   schema, RLS policies, signup trigger, delete function
src/lib/                            supabase client, types, date helpers, useHabits hook
src/auth/AuthProvider.tsx           session context
src/components/                     Layout (nav + crisis footer), MoodForm
src/pages/                          Login, Dashboard, Habits, Mood, Sleep, Settings
```
