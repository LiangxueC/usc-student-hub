-- ============================================================
-- USC Student Hub — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- TABLES
-- ────────────────────────────────────────────────────────────

create table if not exists public.classes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  location      text,
  meeting_times text,          -- e.g. "MWF 10:00–10:50am"
  semester      text,          -- e.g. "Fall 2025"
  created_at    timestamptz not null default now()
);

create table if not exists public.assignments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  class_id   uuid references public.classes(id) on delete set null,
  title      text not null,
  due_date   date,
  weight     numeric(5, 2),   -- percentage, e.g. 15.00
  grade      numeric(5, 2),   -- score out of 100, e.g. 92.50
  is_done    boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.todos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  due_date   date,
  is_done    boolean not null default false,
  created_at timestamptz not null default now()
);


-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

alter table public.classes     enable row level security;
alter table public.assignments enable row level security;
alter table public.todos       enable row level security;


-- classes policies
create policy "classes: users see own rows"
  on public.classes for select
  using (auth.uid() = user_id);

create policy "classes: users insert own rows"
  on public.classes for insert
  with check (auth.uid() = user_id);

create policy "classes: users update own rows"
  on public.classes for update
  using (auth.uid() = user_id);

create policy "classes: users delete own rows"
  on public.classes for delete
  using (auth.uid() = user_id);


-- assignments policies
create policy "assignments: users see own rows"
  on public.assignments for select
  using (auth.uid() = user_id);

create policy "assignments: users insert own rows"
  on public.assignments for insert
  with check (auth.uid() = user_id);

create policy "assignments: users update own rows"
  on public.assignments for update
  using (auth.uid() = user_id);

create policy "assignments: users delete own rows"
  on public.assignments for delete
  using (auth.uid() = user_id);


-- todos policies
create policy "todos: users see own rows"
  on public.todos for select
  using (auth.uid() = user_id);

create policy "todos: users insert own rows"
  on public.todos for insert
  with check (auth.uid() = user_id);

create policy "todos: users update own rows"
  on public.todos for update
  using (auth.uid() = user_id);

create policy "todos: users delete own rows"
  on public.todos for delete
  using (auth.uid() = user_id);
