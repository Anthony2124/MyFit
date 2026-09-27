# Steady — habits, mood, sleep & fitness

An installable React + Supabase wellness app (PWA): habits with streaks, a private mood journal,
a sleep log, water tracking, workouts and weight, insights, and guided breathing. Built privacy-first
because it stores health and mental-health data.

**Stack:** React 19 · TypeScript · Vite · React Router · Supabase (Postgres, Auth, RLS)

## Setup

1. **Create a Supabase project** at <https://supabase.com/dashboard>.
2. **Create the schema:** in the dashboard open **SQL Editor** and run each file in
   `supabase/migrations/` **in order** (0001, 0002, 0003).
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

## Install as an app

Steady is a Progressive Web App. Build it with `npm run build` and deploy `dist/` over HTTPS
(or try it locally with `npm run preview`). Then:

- **Desktop (Chrome/Edge):** click **Install** in the sidebar, or the install icon in the address bar.
- **Android:** tap **Install** in the top bar, or browser menu → *Install app*.
- **iPhone/iPad:** Share → *Add to Home Screen*.

Once installed it opens full-screen with its own icon, offers home-screen shortcuts (Log mood, Log workout,
Log sleep, Breathe), and starts offline. The service worker (`public/sw.js`) caches only static files.
It never intercepts or stores Supabase API responses, so health data isn't left in the browser cache.
The worker is registered only in production builds, so `npm run dev` isn't affected.

## Features

| Page     | What it does |
|----------|--------------|
| Today    | Greeting, progress rings (habits, weekly active minutes, sleep vs goal, last mood), tip of the day, habit checklist, water tracker, quick mood check-in, quick links |
| Habits   | Weekly goal, color and icon; starter templates; 7-day tap grid; edit; archive/restore/delete; per-habit stats (current/best streak, 30-day rate) and a 12-week heatmap |
| Mood     | 1–5 mood + energy, preset and custom tags, journaling prompts, 7/30/90-day trend chart, search and tag filter |
| Sleep    | Enter bed/wake times or hours, quality, edit past nights, 14-night chart vs goal, 7-night average and sleep debt |
| Fitness  | Workouts (type, minutes, intensity, distance), weekly minutes vs the WHO 150-min goal, active-day streak, personal bests, "log again"; weight in kg or lb with trend chart and 30-day change |
| Insights | This week vs last week, habit consistency heatmap, mood correlations (sleep, exercise, water, habits), mood by weekday and by tag, 12 achievements |
| Calm     | Guided breathing (box, 4-7-8, slow & even) with an animated pacer, meditation timer with chime, 5-4-3-2-1 grounding |
| Settings | Name and goals (water, sleep, weight unit), light/dark/system theme, install button, reminders, JSON + per-table CSV export, account deletion |

Across the app: responsive layout (sidebar on desktop, bottom tab bar on mobile), an offline banner,
toast confirmations, password reset, and code-split pages.

**Reminders** are stored per device (localStorage). They appear as system notifications while the app is
open or running as an installed app. True background push (with the app fully closed) needs Web Push and a
server-side sender, for example a scheduled Supabase Edge Function.

## Privacy & safety design

- **Row-level security on every table.** Policies restrict every row to `auth.uid()`, so the
  public anon key can't read anyone else's data. Habit logs can only reference habits you own.
- **Explicit consent at sign-up** describing what's stored.
- **Data portability:** one-click JSON export of everything tied to the account, plus CSV per table.
- **Right to erasure:** `delete_my_account()` removes the auth user; all data cascades.
- **No third-party analytics or trackers** are included.
- **Crisis resources:** a persistent footer, plus a gentle prompt when a user logs a low mood,
  point to 988 / findahelpline.com. The app states it is not medical care.

### Before launching to real users

- If you handle data on behalf of US healthcare providers you may need **HIPAA** compliance —
  Supabase offers a BAA on its Team/Enterprise plans. In the EU/UK, health data is GDPR
  "special category" data, which needs explicit consent and a privacy policy.
- Turn on **email confirmation**, **leaked password protection**, and consider **MFA** in Supabase Auth settings.
- Add your deployed URL to **Auth → URL Configuration → Redirect URLs** so password-reset links work.
- Write a privacy policy and terms of service. The consent text in `Login.tsx` is only a placeholder.

## Ideas for what's next

Server-sent push/email reminders, weekly insight emails, gentle streak recovery (freeze days rather
than resetting to zero), and a paid tier (Stripe) for deeper insights.

## Project layout

```
supabase/migrations/0001_init.sql                 schema, RLS policies, signup trigger, delete function
supabase/migrations/0003_fitness_water_prefs.sql  water, workouts, body metrics, goal/unit preferences
public/                                           PWA manifest, service worker, app icons
src/lib/                                          supabase client, types, date/unit helpers, hooks
                                                  (habits, water, profile, PWA, reminders, theme)
src/auth/AuthProvider.tsx                         session + password-recovery context
src/components/                                   Layout, Charts (SVG), MoodForm, WaterCard, Toast
src/pages/                                        Login, Dashboard, Habits, Mood, Sleep, Fitness,
                                                  Insights, Calm, Settings, More
```
