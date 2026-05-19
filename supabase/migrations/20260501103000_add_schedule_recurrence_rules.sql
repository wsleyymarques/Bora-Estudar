create table if not exists public.schedule_recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  schedule_id uuid not null references public.study_schedules(id) on delete cascade,
  plan_id uuid references public.study_plans(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  weekdays smallint[] not null default '{}',
  optional boolean not null default false,
  start_time text,
  planned_minutes integer,
  item_note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_recurrence_rules_weekdays_check check (cardinality(weekdays) > 0),
  constraint schedule_recurrence_rules_date_order_check check (end_date >= start_date)
);

create or replace function public.validate_weekdays_array(weekdays smallint[])
returns boolean
language sql
immutable
as $$
  select not exists (
    select 1
    from unnest(weekdays) as weekday
    where weekday < 0 or weekday > 6
  );
$$;

alter table public.schedule_recurrence_rules
  drop constraint if exists schedule_recurrence_rules_weekdays_range_check;

alter table public.schedule_recurrence_rules
  add constraint schedule_recurrence_rules_weekdays_range_check
  check (public.validate_weekdays_array(weekdays));

alter table public.schedule_recurrence_rules enable row level security;

grant select, insert, update, delete on public.schedule_recurrence_rules to anon, authenticated, service_role;

drop policy if exists "Users can view own recurrence rules" on public.schedule_recurrence_rules;
create policy "Users can view own recurrence rules"
on public.schedule_recurrence_rules
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own recurrence rules" on public.schedule_recurrence_rules;
create policy "Users can insert own recurrence rules"
on public.schedule_recurrence_rules
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own recurrence rules" on public.schedule_recurrence_rules;
create policy "Users can update own recurrence rules"
on public.schedule_recurrence_rules
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own recurrence rules" on public.schedule_recurrence_rules;
create policy "Users can delete own recurrence rules"
on public.schedule_recurrence_rules
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists idx_schedule_recurrence_rules_user_id on public.schedule_recurrence_rules(user_id);
create index if not exists idx_schedule_recurrence_rules_schedule_id on public.schedule_recurrence_rules(schedule_id);
create index if not exists idx_schedule_recurrence_rules_plan_id on public.schedule_recurrence_rules(plan_id);
create index if not exists idx_schedule_recurrence_rules_subject_id on public.schedule_recurrence_rules(subject_id);
create index if not exists idx_schedule_recurrence_rules_active on public.schedule_recurrence_rules(active);

do $$
begin
  if to_regclass('public.schedule_entries') is not null then
    alter table public.schedule_entries
      add column if not exists recurrence_rule_id uuid references public.schedule_recurrence_rules(id) on delete set null;
    create index if not exists idx_schedule_entries_recurrence_rule_id on public.schedule_entries(recurrence_rule_id);
    create index if not exists idx_schedule_entries_plan_schedule_date on public.schedule_entries(plan_id, schedule_id, date);
  end if;
end $$;

drop trigger if exists update_schedule_recurrence_rules_updated_at on public.schedule_recurrence_rules;
create trigger update_schedule_recurrence_rules_updated_at
  before update on public.schedule_recurrence_rules
  for each row execute function public.update_updated_at_column();

notify pgrst, 'reload schema';
