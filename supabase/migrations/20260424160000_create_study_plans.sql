-- Alinha o banco com a branch feature/study-plans-reviews.
-- Migration idempotente para Supabase/PostgREST.

create extension if not exists pgcrypto;

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  schedule_id uuid,
  name text,
  title text,
  exam_name text,
  board_name text,
  board text,
  role_name text,
  role text,
  description text,
  cover_image_url text,
  image_url text,
  status text not null default 'active',
  start_date date,
  target_date date,
  review_interval_days integer not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.study_plans add column if not exists user_id uuid;
alter table public.study_plans add column if not exists schedule_id uuid;
alter table public.study_plans add column if not exists name text;
alter table public.study_plans add column if not exists title text;
alter table public.study_plans add column if not exists exam_name text;
alter table public.study_plans add column if not exists board_name text;
alter table public.study_plans add column if not exists board text;
alter table public.study_plans add column if not exists role_name text;
alter table public.study_plans add column if not exists role text;
alter table public.study_plans add column if not exists description text;
alter table public.study_plans add column if not exists cover_image_url text;
alter table public.study_plans add column if not exists image_url text;
alter table public.study_plans add column if not exists status text not null default 'active';
alter table public.study_plans add column if not exists start_date date;
alter table public.study_plans add column if not exists target_date date;
alter table public.study_plans add column if not exists review_interval_days integer not null default 7;
alter table public.study_plans add column if not exists created_at timestamptz not null default now();
alter table public.study_plans add column if not exists updated_at timestamptz not null default now();

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

alter table public.study_plans drop constraint if exists study_plans_schedule_id_fkey;
alter table public.study_plans add constraint study_plans_schedule_id_fkey foreign key (schedule_id) references public.study_schedules(id) on delete set null;

update public.study_plans set name = coalesce(name, title, exam_name, 'Plano de Estudos') where name is null;
update public.study_plans set title = coalesce(title, name, exam_name, 'Plano de Estudos') where title is null;

create table if not exists public.subject_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  description text,
  is_system boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subject_categories (
  id uuid primary key default gen_random_uuid(),
  area_id uuid references public.subject_areas(id) on delete set null,
  parent_id uuid references public.subject_categories(id) on delete set null,
  name text not null,
  slug text,
  description text,
  is_system boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_plan_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  subject_id uuid not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_id, subject_id)
);

create unique index if not exists idx_subject_areas_slug on public.subject_areas(slug) where slug is not null;
create index if not exists idx_subject_categories_area_id on public.subject_categories(area_id);
create index if not exists idx_subject_categories_parent_id on public.subject_categories(parent_id);

insert into public.subject_areas (name, slug, description, is_system)
values
  ('Conhecimentos Básicos', 'conhecimentos-basicos', 'Matérias gerais de concursos.', true),
  ('Conhecimentos Específicos', 'conhecimentos-especificos', 'Matérias específicas por cargo ou área.', true)
on conflict do nothing;

insert into public.subject_categories (area_id, name, slug, description, is_system)
select area.id, category.name, category.slug, category.description, true
from public.subject_areas area
join (
  values
    ('conhecimentos-basicos', 'Português', 'portugues', 'Língua Portuguesa'),
    ('conhecimentos-basicos', 'Matemática', 'matematica', 'Matemática e raciocínio lógico'),
    ('conhecimentos-especificos', 'Direito', 'direito', 'Disciplinas jurídicas'),
    ('conhecimentos-especificos', 'Tecnologia', 'tecnologia', 'Tecnologia e dados')
) as category(area_slug, name, slug, description) on category.area_slug = area.slug
on conflict do nothing;

do $$
begin
  if to_regclass('public.subjects') is not null then
    alter table public.subjects add column if not exists plan_id uuid references public.study_plans(id) on delete set null;
    alter table public.subjects add column if not exists slug text;
    alter table public.subjects add column if not exists description text;
    alter table public.subjects add column if not exists icon text;
    alter table public.subjects add column if not exists origin text not null default 'user';
    alter table public.subjects add column if not exists status text not null default 'active';
    alter table public.subjects add column if not exists area_id uuid references public.subject_areas(id) on delete set null;
    alter table public.subjects add column if not exists category_id uuid references public.subject_categories(id) on delete set null;
    alter table public.subjects add column if not exists subcategory_id uuid references public.subject_categories(id) on delete set null;
    create index if not exists idx_subjects_plan_id on public.subjects(plan_id);
    create index if not exists idx_subjects_area_id on public.subjects(area_id);
    create index if not exists idx_subjects_category_id on public.subjects(category_id);
  end if;

  if to_regclass('public.schedule_entries') is not null then
    alter table public.schedule_entries add column if not exists plan_id uuid references public.study_plans(id) on delete set null;
    alter table public.schedule_entries add column if not exists schedule_id uuid references public.study_schedules(id) on delete cascade;
    alter table public.study_plan_subjects drop constraint if exists study_plan_subjects_subject_id_fkey;
    alter table public.study_plan_subjects add constraint study_plan_subjects_subject_id_fkey foreign key (subject_id) references public.subjects(id) on delete cascade;
    create index if not exists idx_schedule_entries_plan_id on public.schedule_entries(plan_id);
    create index if not exists idx_schedule_entries_schedule_id on public.schedule_entries(schedule_id);
  end if;

  if to_regclass('public.schedule_day_plans') is not null then
    alter table public.schedule_day_plans add column if not exists plan_id uuid references public.study_plans(id) on delete set null;
    alter table public.schedule_day_plans add column if not exists schedule_id uuid references public.study_schedules(id) on delete cascade;
    create index if not exists idx_schedule_day_plans_plan_id on public.schedule_day_plans(plan_id);
    create index if not exists idx_schedule_day_plans_schedule_id on public.schedule_day_plans(schedule_id);
  end if;

  if to_regclass('public.study_sessions') is not null then
    alter table public.study_sessions add column if not exists plan_id uuid references public.study_plans(id) on delete set null;
    alter table public.study_sessions add column if not exists schedule_id uuid references public.study_schedules(id) on delete set null;
    alter table public.study_sessions add column if not exists session_mode text default 'manual';
    alter table public.study_sessions add column if not exists status text default 'completed';
    alter table public.study_sessions add column if not exists source text default 'manual';
    alter table public.study_sessions add column if not exists pomodoro_phase text;
    alter table public.study_sessions add column if not exists pomodoro_cycle integer;
    alter table public.study_sessions add column if not exists is_focus_session boolean default true;
    alter table public.study_sessions add column if not exists started_at timestamptz;
    alter table public.study_sessions add column if not exists ended_at timestamptz;
    alter table public.study_sessions add column if not exists actual_duration_seconds integer;
    alter table public.study_sessions add column if not exists total_pause_seconds integer default 0;
    alter table public.study_sessions add column if not exists clock_duration_seconds integer;
    alter table public.study_sessions add column if not exists planned_start_time text;
    alter table public.study_sessions add column if not exists planned_minutes integer;
    alter table public.study_sessions add column if not exists schedule_date date;
    alter table public.study_sessions add column if not exists schedule_entry_id uuid;
    alter table public.study_sessions add column if not exists metadata jsonb default '{}'::jsonb;
    alter table public.study_sessions add column if not exists created_at timestamptz not null default now();
    create index if not exists idx_study_sessions_plan_id on public.study_sessions(plan_id);
    create index if not exists idx_study_sessions_schedule_id on public.study_sessions(schedule_id);
    create index if not exists idx_study_sessions_started_at on public.study_sessions(started_at desc);
  end if;

  if to_regclass('public.notes') is not null then
    alter table public.notes add column if not exists plan_id uuid references public.study_plans(id) on delete set null;
    alter table public.notes add column if not exists schedule_id uuid references public.study_schedules(id) on delete set null;
    create index if not exists idx_notes_plan_id on public.notes(plan_id);
    create index if not exists idx_notes_schedule_id on public.notes(schedule_id);
  end if;
end $$;

create table if not exists public.study_session_pauses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  user_id uuid not null,
  pause_started_at timestamptz not null,
  pause_ended_at timestamptz,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_study_plan_subjects_user_id on public.study_plan_subjects(user_id);
create index if not exists idx_study_plan_subjects_plan_id on public.study_plan_subjects(plan_id);
create index if not exists idx_study_plan_subjects_subject_id on public.study_plan_subjects(subject_id);
create index if not exists idx_study_session_pauses_session_id on public.study_session_pauses(session_id);
create index if not exists idx_study_session_pauses_user_id on public.study_session_pauses(user_id);
create index if not exists idx_study_session_pauses_started_at on public.study_session_pauses(pause_started_at desc);

alter table public.study_plans enable row level security;
alter table public.study_schedules enable row level security;
alter table public.study_plan_subjects enable row level security;
alter table public.subject_areas enable row level security;
alter table public.subject_categories enable row level security;
alter table public.study_session_pauses enable row level security;

drop policy if exists "Users can view own study plans" on public.study_plans;
create policy "Users can view own study plans" on public.study_plans for select using (auth.uid() = user_id);
drop policy if exists "Users can create own study plans" on public.study_plans;
create policy "Users can create own study plans" on public.study_plans for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own study plans" on public.study_plans;
create policy "Users can update own study plans" on public.study_plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own study plans" on public.study_plans;
create policy "Users can delete own study plans" on public.study_plans for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own study schedules" on public.study_schedules;
create policy "Users can view own study schedules" on public.study_schedules for select using (auth.uid() = user_id);
drop policy if exists "Users can create own study schedules" on public.study_schedules;
create policy "Users can create own study schedules" on public.study_schedules for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own study schedules" on public.study_schedules;
create policy "Users can update own study schedules" on public.study_schedules for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own study schedules" on public.study_schedules;
create policy "Users can delete own study schedules" on public.study_schedules for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own study plan subjects" on public.study_plan_subjects;
create policy "Users can view own study plan subjects" on public.study_plan_subjects for select using (auth.uid() = user_id);
drop policy if exists "Users can create own study plan subjects" on public.study_plan_subjects;
create policy "Users can create own study plan subjects" on public.study_plan_subjects for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own study plan subjects" on public.study_plan_subjects;
create policy "Users can update own study plan subjects" on public.study_plan_subjects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own study plan subjects" on public.study_plan_subjects;
create policy "Users can delete own study plan subjects" on public.study_plan_subjects for delete using (auth.uid() = user_id);

drop policy if exists "Users can view subject areas" on public.subject_areas;
create policy "Users can view subject areas" on public.subject_areas for select using (is_system = true or auth.uid() = created_by);
drop policy if exists "Users can manage own subject areas" on public.subject_areas;
create policy "Users can manage own subject areas" on public.subject_areas for all using (auth.uid() = created_by) with check (auth.uid() = created_by);

drop policy if exists "Users can view subject categories" on public.subject_categories;
create policy "Users can view subject categories" on public.subject_categories for select using (is_system = true or auth.uid() = created_by);
drop policy if exists "Users can manage own subject categories" on public.subject_categories;
create policy "Users can manage own subject categories" on public.subject_categories for all using (auth.uid() = created_by) with check (auth.uid() = created_by);

drop policy if exists "Users can view own study session pauses" on public.study_session_pauses;
create policy "Users can view own study session pauses" on public.study_session_pauses for select using (auth.uid() = user_id);
drop policy if exists "Users can create own study session pauses" on public.study_session_pauses;
create policy "Users can create own study session pauses" on public.study_session_pauses for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own study session pauses" on public.study_session_pauses;
create policy "Users can update own study session pauses" on public.study_session_pauses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own study session pauses" on public.study_session_pauses;
create policy "Users can delete own study session pauses" on public.study_session_pauses for delete using (auth.uid() = user_id);

create index if not exists idx_study_plans_user_id on public.study_plans(user_id);
create index if not exists idx_study_plans_schedule_id on public.study_plans(schedule_id);
create index if not exists idx_study_plans_created_at on public.study_plans(created_at desc);
create index if not exists idx_study_schedules_user_id on public.study_schedules(user_id);
create index if not exists idx_study_schedules_active on public.study_schedules(user_id, is_active);

notify pgrst, 'reload schema';
