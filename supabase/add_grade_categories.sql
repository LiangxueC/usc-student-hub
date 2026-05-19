-- Run this in Supabase Dashboard → SQL Editor → New Query

create table if not exists public.grade_categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  class_id   uuid not null references public.classes(id) on delete cascade,
  name       text not null,
  weight     numeric(5,2) not null,
  created_at timestamptz not null default now()
);

alter table public.grade_categories enable row level security;

create policy "grade_categories: users see own rows"
  on public.grade_categories for select using (auth.uid() = user_id);
create policy "grade_categories: users insert own rows"
  on public.grade_categories for insert with check (auth.uid() = user_id);
create policy "grade_categories: users update own rows"
  on public.grade_categories for update using (auth.uid() = user_id);
create policy "grade_categories: users delete own rows"
  on public.grade_categories for delete using (auth.uid() = user_id);

-- Add category_id foreign key to assignments
alter table public.assignments
  add column if not exists category_id uuid references public.grade_categories(id) on delete set null;
