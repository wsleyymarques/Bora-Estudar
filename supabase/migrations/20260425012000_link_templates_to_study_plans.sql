-- Link templates directly to study plans while keeping the existing schedule link.
-- This keeps templates usable separately and also usable inside the Planos de Estudos flow.

alter table if exists public.weekly_templates
  add column if not exists plan_id uuid references public.study_plans(id) on delete cascade;

create index if not exists idx_weekly_templates_plan_id
  on public.weekly_templates(plan_id);

-- Some environments were created before plan-aware schedule generation.
-- Keep these columns idempotent so templates applied from a plan can populate the plan cronograma.
alter table if exists public.schedule_entries
  add column if not exists plan_id uuid references public.study_plans(id) on delete set null;

create index if not exists idx_schedule_entries_plan_id
  on public.schedule_entries(plan_id);

alter table if exists public.schedule_day_plans
  add column if not exists plan_id uuid references public.study_plans(id) on delete set null;

create index if not exists idx_schedule_day_plans_plan_id
  on public.schedule_day_plans(plan_id);

notify pgrst, 'reload schema';
