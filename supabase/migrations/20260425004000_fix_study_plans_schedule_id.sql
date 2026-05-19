-- Hotfix: garante que planos tenham vínculo com cronograma mesmo quando a migration antiga já foi aplicada.

create extension if not exists pgcrypto;

create table if not exists public.study_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  description text,
  color text,
  status text not null default 'active',
  start_date date not null default current_date,
  end_date date,
  is_active boolean not null default true,
  view_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.study_plans add column if not exists schedule_id uuid;

alter table public.study_plans drop constraint if exists study_plans_schedule_id_fkey;
alter table public.study_plans
  add constraint study_plans_schedule_id_fkey
  foreign key (schedule_id)
  references public.study_schedules(id)
  on delete set null;

alter table public.study_schedules enable row level security;

drop policy if exists "Users can view own study schedules" on public.study_schedules;
create policy "Users can view own study schedules"
  on public.study_schedules for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own study schedules" on public.study_schedules;
create policy "Users can create own study schedules"
  on public.study_schedules for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own study schedules" on public.study_schedules;
create policy "Users can update own study schedules"
  on public.study_schedules for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own study schedules" on public.study_schedules;
create policy "Users can delete own study schedules"
  on public.study_schedules for delete
  using (auth.uid() = user_id);

create index if not exists idx_study_plans_schedule_id on public.study_plans(schedule_id);
create index if not exists idx_study_schedules_user_id on public.study_schedules(user_id);
create index if not exists idx_study_schedules_active on public.study_schedules(user_id, is_active);

notify pgrst, 'reload schema';
