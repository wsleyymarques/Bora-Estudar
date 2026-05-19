alter table public.study_schedules add column if not exists plan_id uuid references public.study_plans(id) on delete cascade;
create index if not exists idx_study_schedules_plan_id on public.study_schedules(plan_id);

alter table public.subjects add column if not exists plan_id uuid references public.study_plans(id) on delete set null;
create index if not exists idx_subjects_plan_id on public.subjects(plan_id);

alter table public.schedule_entries add column if not exists plan_id uuid references public.study_plans(id) on delete cascade;
create index if not exists idx_schedule_entries_plan_id on public.schedule_entries(plan_id);

alter table public.schedule_day_plans add column if not exists plan_id uuid references public.study_plans(id) on delete cascade;
create index if not exists idx_schedule_day_plans_plan_id on public.schedule_day_plans(plan_id);

notify pgrst, 'reload schema';
