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

create index if not exists study_plans_user_id_idx on public.study_plans(user_id);
create index if not exists study_plans_status_idx on public.study_plans(status);

alter table public.subjects
  add column if not exists plan_id uuid references public.study_plans(id) on delete cascade;

alter table public.weekly_templates
  add column if not exists plan_id uuid references public.study_plans(id) on delete cascade;

alter table public.schedule_entries
  add column if not exists plan_id uuid references public.study_plans(id) on delete cascade;

alter table public.schedule_day_plans
  add column if not exists plan_id uuid references public.study_plans(id) on delete cascade;

alter table public.study_sessions
  add column if not exists plan_id uuid references public.study_plans(id) on delete cascade;

alter table public.notes
  add column if not exists plan_id uuid references public.study_plans(id) on delete cascade;

create index if not exists subjects_plan_id_idx on public.subjects(plan_id);
create index if not exists weekly_templates_plan_id_idx on public.weekly_templates(plan_id);
create index if not exists schedule_entries_plan_date_idx on public.schedule_entries(plan_id, date);
create index if not exists schedule_day_plans_plan_date_idx on public.schedule_day_plans(plan_id, date);
create index if not exists study_sessions_plan_date_idx on public.study_sessions(plan_id, date);
create index if not exists notes_plan_reference_idx on public.notes(plan_id, reference_date);
