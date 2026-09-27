-- Fitness, hydration and preferences.
-- Same privacy model as 0001: every new table has RLS scoped to auth.uid().

-- ---------- Preferences ----------
alter table public.profiles
  add column water_goal  smallint not null default 8 check (water_goal between 1 and 30),
  add column sleep_goal  numeric(4, 2) not null default 8 check (sleep_goal between 3 and 14),
  add column weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lb'));

-- ---------- Habit extras ----------
alter table public.habits
  add column icon text check (char_length(icon) <= 8);

-- ---------- Water ----------
create table public.water_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date   date not null,
  glasses    smallint not null default 0 check (glasses between 0 and 50),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- ---------- Workouts ----------
create table public.workouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workout_date date not null,
  kind         text not null check (char_length(kind) between 1 and 40),
  minutes      smallint not null check (minutes between 1 and 1440),
  intensity    smallint not null default 2 check (intensity between 1 and 3),
  distance_km  numeric(6, 2) check (distance_km >= 0),
  note         text check (char_length(note) <= 2000),
  created_at   timestamptz not null default now()
);
create index workouts_user_date_idx on public.workouts (user_id, workout_date desc);

-- ---------- Body weight (always stored in kg) ----------
create table public.body_metrics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  measured_on date not null,
  weight_kg   numeric(5, 2) not null check (weight_kg between 20 and 400),
  note        text check (char_length(note) <= 500),
  created_at  timestamptz not null default now(),
  unique (user_id, measured_on)
);

-- ---------- Row-level security ----------
alter table public.water_logs   enable row level security;
alter table public.workouts     enable row level security;
alter table public.body_metrics enable row level security;

create policy "own water logs"   on public.water_logs   for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own workouts"     on public.workouts     for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own body metrics" on public.body_metrics for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
