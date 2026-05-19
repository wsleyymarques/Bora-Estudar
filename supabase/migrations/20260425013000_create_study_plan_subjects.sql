create table if not exists public.study_plan_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, plan_id, subject_id)
);

create index if not exists idx_study_plan_subjects_user_id on public.study_plan_subjects(user_id);
create index if not exists idx_study_plan_subjects_plan_id on public.study_plan_subjects(plan_id);
create index if not exists idx_study_plan_subjects_subject_id on public.study_plan_subjects(subject_id);

alter table public.study_plan_subjects enable row level security;

drop policy if exists "Users can view own study plan subjects" on public.study_plan_subjects;
create policy "Users can view own study plan subjects"
on public.study_plan_subjects
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own study plan subjects" on public.study_plan_subjects;
create policy "Users can insert own study plan subjects"
on public.study_plan_subjects
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own study plan subjects" on public.study_plan_subjects;
create policy "Users can update own study plan subjects"
on public.study_plan_subjects
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own study plan subjects" on public.study_plan_subjects;
create policy "Users can delete own study plan subjects"
on public.study_plan_subjects
for delete
to authenticated
using (auth.uid() = user_id);

insert into public.study_plan_subjects (user_id, plan_id, subject_id, sort_order)
select s.user_id, s.plan_id, s.id, coalesce(s.sort_order, 0)
from public.subjects s
where s.plan_id is not null
  and s.user_id is not null
on conflict (user_id, plan_id, subject_id) do nothing;

notify pgrst, 'reload schema';
