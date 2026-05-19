create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  exam_name text null,
  board_name text null,
  role_name text null,
  description text null,
  cover_image_url text null,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  start_date date null,
  target_date date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.study_plans enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table public.study_plans to anon, authenticated, service_role;

drop policy if exists "Users can view own study plans" on public.study_plans;
drop policy if exists "Users can create own study plans" on public.study_plans;
drop policy if exists "Users can update own study plans" on public.study_plans;
drop policy if exists "Users can delete own study plans" on public.study_plans;

create policy "Users can view own study plans"
  on public.study_plans for select
  using (auth.uid() = user_id);

create policy "Users can create own study plans"
  on public.study_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own study plans"
  on public.study_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own study plans"
  on public.study_plans for delete
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
