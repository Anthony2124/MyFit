-- Wellness tracker schema.
-- Every table holding personal data has RLS enabled and is scoped to auth.uid().

-- ---------- Profiles ----------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

-- Create a profile row automatically when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Habits ----------
create table public.habits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 80),
  color           text not null default '#4f8a6e',
  target_per_week smallint not null default 7 check (target_per_week between 1 and 7),
  archived        boolean not null default false,
  created_at      timestamptz not null default now()
);
create index habits_user_idx on public.habits (user_id);

create table public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id   uuid not null references public.habits (id) on delete cascade,
  log_date   date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);
create index habit_logs_user_date_idx on public.habit_logs (user_id, log_date);

-- ---------- Mood journal ----------
create table public.mood_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mood       smallint not null check (mood between 1 and 5),
  energy     smallint check (energy between 1 and 5),
  tags       text[] not null default '{}',
  note       text check (char_length(note) <= 5000),
  created_at timestamptz not null default now()
);
create index mood_entries_user_created_idx on public.mood_entries (user_id, created_at desc);

-- ---------- Sleep ----------
create table public.sleep_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sleep_date date not null,              -- the night the user went to bed
  hours      numeric(4, 2) not null check (hours between 0 and 24),
  quality    smallint not null check (quality between 1 and 5),
  note       text check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  unique (user_id, sleep_date)
);

-- ---------- Row-level security ----------
alter table public.profiles     enable row level security;
alter table public.habits       enable row level security;
alter table public.habit_logs   enable row level security;
alter table public.mood_entries enable row level security;
alter table public.sleep_logs   enable row level security;

create policy "own profile read"   on public.profiles for select using (id = (select auth.uid()));
create policy "own profile update" on public.profiles for update using (id = (select auth.uid()));

create policy "own habits"       on public.habits       for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own mood entries" on public.mood_entries for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own sleep logs"   on public.sleep_logs   for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- A log may only reference a habit the user owns.
create policy "own habit logs" on public.habit_logs for all
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()))
  );

-- ---------- Account deletion ----------
-- Lets a signed-in user permanently delete their own account.
-- All their data is removed via ON DELETE CASCADE.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
