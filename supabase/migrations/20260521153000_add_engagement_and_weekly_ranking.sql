alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists streak_current integer not null default 0,
  add column if not exists xp_total integer not null default 0,
  add column if not exists xp_weekly integer not null default 0,
  add column if not exists minutes_today integer not null default 0,
  add column if not exists daily_goal_minutes integer not null default 30,
  add column if not exists daily_goal_reached boolean not null default false,
  add column if not exists profile_private boolean not null default false,
  add column if not exists last_streak_date date,
  add column if not exists last_processed_date date;

alter table public.profiles
  drop constraint if exists profiles_streak_current_non_negative,
  drop constraint if exists profiles_xp_total_non_negative,
  drop constraint if exists profiles_xp_weekly_non_negative,
  drop constraint if exists profiles_minutes_today_non_negative,
  drop constraint if exists profiles_daily_goal_minutes_positive;

alter table public.profiles
  add constraint profiles_streak_current_non_negative check (streak_current >= 0),
  add constraint profiles_xp_total_non_negative check (xp_total >= 0),
  add constraint profiles_xp_weekly_non_negative check (xp_weekly >= 0),
  add constraint profiles_minutes_today_non_negative check (minutes_today >= 0),
  add constraint profiles_daily_goal_minutes_positive check (daily_goal_minutes > 0);

create table if not exists public.study_reward_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_date date not null,
  week_start date not null,
  event_type text not null check (event_type in ('daily_goal_bonus', 'weekly_streak_bonus')),
  xp_amount integer not null check (xp_amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, event_date, event_type)
);

alter table public.study_reward_events enable row level security;

drop policy if exists "Users can view own reward events" on public.study_reward_events;
create policy "Users can view own reward events"
  on public.study_reward_events
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own reward events" on public.study_reward_events;
create policy "Users can insert own reward events"
  on public.study_reward_events
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own reward events" on public.study_reward_events;
create policy "Users can update own reward events"
  on public.study_reward_events
  for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own reward events" on public.study_reward_events;
create policy "Users can delete own reward events"
  on public.study_reward_events
  for delete
  using (auth.uid() = user_id);

create index if not exists idx_study_reward_events_user_date
  on public.study_reward_events(user_id, event_date desc);

create index if not exists idx_study_reward_events_user_week
  on public.study_reward_events(user_id, week_start desc);

create or replace function public.week_start_for(target_date date)
returns date
language sql
immutable
as $$
  select date_trunc('week', target_date::timestamp)::date;
$$;

create or replace function public.get_session_minutes_for_day(target_user_id uuid, target_day date)
returns integer
language sql
stable
as $$
  select coalesce(sum(
    case
      when coalesce(actual_duration_seconds, 0) > 0 then greatest(round(actual_duration_seconds / 60.0)::integer, 0)
      else greatest(coalesce(duration_minutes, 0), 0)
    end
  ), 0)::integer
  from public.study_sessions
  where user_id = target_user_id
    and date = target_day
    and coalesce(status, 'completed') = 'completed'
    and coalesce(is_focus_session, true) = true;
$$;

create or replace function public.refresh_user_engagement(target_user_id uuid, target_date date default current_date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_goal integer := 30;
  today_minutes_value integer := 0;
  weekly_minutes_value integer := 0;
  total_minutes_value integer := 0;
  weekly_bonus_value integer := 0;
  total_bonus_value integer := 0;
  week_start_value date := public.week_start_for(target_date);
begin
  insert into public.profiles (id)
  values (target_user_id)
  on conflict (id) do nothing;

  select daily_goal_minutes
    into profile_goal
  from public.profiles
  where id = target_user_id;

  today_minutes_value := public.get_session_minutes_for_day(target_user_id, target_date);

  select coalesce(sum(
    case
      when coalesce(actual_duration_seconds, 0) > 0 then greatest(round(actual_duration_seconds / 60.0)::integer, 0)
      else greatest(coalesce(duration_minutes, 0), 0)
    end
  ), 0)::integer
    into weekly_minutes_value
  from public.study_sessions
  where user_id = target_user_id
    and date between week_start_value and (week_start_value + 6)
    and coalesce(status, 'completed') = 'completed'
    and coalesce(is_focus_session, true) = true;

  select coalesce(sum(
    case
      when coalesce(actual_duration_seconds, 0) > 0 then greatest(round(actual_duration_seconds / 60.0)::integer, 0)
      else greatest(coalesce(duration_minutes, 0), 0)
    end
  ), 0)::integer
    into total_minutes_value
  from public.study_sessions
  where user_id = target_user_id
    and coalesce(status, 'completed') = 'completed'
    and coalesce(is_focus_session, true) = true;

  if today_minutes_value >= profile_goal then
    insert into public.study_reward_events (user_id, event_date, week_start, event_type, xp_amount)
    values (target_user_id, target_date, week_start_value, 'daily_goal_bonus', 50)
    on conflict (user_id, event_date, event_type) do update
      set week_start = excluded.week_start,
          xp_amount = excluded.xp_amount;
  else
    delete from public.study_reward_events
    where user_id = target_user_id
      and event_date = target_date
      and event_type = 'daily_goal_bonus';
  end if;

  select coalesce(sum(xp_amount), 0)::integer
    into weekly_bonus_value
  from public.study_reward_events
  where user_id = target_user_id
    and week_start = week_start_value;

  select coalesce(sum(xp_amount), 0)::integer
    into total_bonus_value
  from public.study_reward_events
  where user_id = target_user_id;

  update public.profiles
  set minutes_today = today_minutes_value,
      daily_goal_reached = today_minutes_value >= profile_goal,
      xp_weekly = weekly_minutes_value + weekly_bonus_value,
      xp_total = total_minutes_value + total_bonus_value,
      updated_at = now()
  where id = target_user_id;
end;
$$;

create or replace function public.process_daily_streak_rollover(process_date date default current_date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.profiles%rowtype;
  target_day date := process_date - 1;
  loop_day date;
  start_day date;
  current_streak integer;
  current_last_streak date;
  day_minutes_value integer;
  processed_count integer := 0;
begin
  for profile_row in select * from public.profiles loop
    current_streak := coalesce(profile_row.streak_current, 0);
    current_last_streak := profile_row.last_streak_date;

    start_day := case
      when profile_row.last_processed_date is null then target_day
      else profile_row.last_processed_date + 1
    end;

    if start_day > target_day then
      perform public.refresh_user_engagement(profile_row.id, process_date);
      continue;
    end if;

    for loop_day in
      select generate_series(start_day, target_day, interval '1 day')::date
    loop
      day_minutes_value := public.get_session_minutes_for_day(profile_row.id, loop_day);

      if day_minutes_value >= coalesce(profile_row.daily_goal_minutes, 30) then
        if current_last_streak = loop_day - 1 then
          current_streak := current_streak + 1;
        else
          current_streak := 1;
        end if;

        current_last_streak := loop_day;

        if mod(current_streak, 7) = 0 then
          insert into public.study_reward_events (user_id, event_date, week_start, event_type, xp_amount)
          values (profile_row.id, loop_day, public.week_start_for(loop_day), 'weekly_streak_bonus', 200)
          on conflict (user_id, event_date, event_type) do nothing;
        end if;
      else
        current_streak := 0;
      end if;
    end loop;

    update public.profiles
    set streak_current = current_streak,
        last_streak_date = current_last_streak,
        last_processed_date = target_day,
        updated_at = now()
    where id = profile_row.id;

    perform public.refresh_user_engagement(profile_row.id, process_date);
    processed_count := processed_count + 1;
  end loop;

  return processed_count;
end;
$$;

create or replace function public.handle_study_session_engagement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_user_id uuid := coalesce(new.user_id, old.user_id);
begin
  if affected_user_id is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    perform public.refresh_user_engagement(affected_user_id, old.date);
    return old;
  end if;

  perform public.refresh_user_engagement(affected_user_id, new.date);

  if tg_op = 'UPDATE' and old.date is distinct from new.date then
    perform public.refresh_user_engagement(affected_user_id, old.date);
  end if;

  return new;
end;
$$;

drop trigger if exists study_sessions_engagement_trigger on public.study_sessions;
create trigger study_sessions_engagement_trigger
after insert or update or delete on public.study_sessions
for each row execute function public.handle_study_session_engagement();

create or replace function public.get_weekly_ranking(target_date date default current_date, limit_count integer default 25)
returns table (
  rank_position bigint,
  user_id uuid,
  full_name text,
  avatar_url text,
  streak_current integer,
  minutes_week integer,
  xp_weekly integer
)
language sql
security definer
set search_path = public
as $$
  with week_bounds as (
    select public.week_start_for(target_date) as week_start
  ),
  minutes_by_user as (
    select
      s.user_id,
      coalesce(sum(
        case
          when coalesce(s.actual_duration_seconds, 0) > 0 then greatest(round(s.actual_duration_seconds / 60.0)::integer, 0)
          else greatest(coalesce(s.duration_minutes, 0), 0)
        end
      ), 0)::integer as minutes_week
    from public.study_sessions s
    cross join week_bounds wb
    where s.date between wb.week_start and (wb.week_start + 6)
      and coalesce(s.status, 'completed') = 'completed'
      and coalesce(s.is_focus_session, true) = true
    group by s.user_id
  ),
  ranked as (
    select
      row_number() over (
        order by coalesce(p.xp_weekly, 0) desc,
                 coalesce(m.minutes_week, 0) desc,
                 coalesce(nullif(trim(p.full_name), ''), 'Usuário')
      ) as rank_position,
      p.id as user_id,
      coalesce(nullif(trim(p.full_name), ''), 'Usuário') as full_name,
      p.avatar_url,
      p.streak_current,
      coalesce(m.minutes_week, 0) as minutes_week,
      coalesce(p.xp_weekly, 0) as xp_weekly
    from public.profiles p
    left join minutes_by_user m on m.user_id = p.id
    where coalesce(p.profile_private, false) = false
      and (coalesce(p.xp_weekly, 0) > 0 or coalesce(m.minutes_week, 0) > 0)
  )
  select *
  from ranked
  order by rank_position
  limit greatest(limit_count, 1);
$$;

grant execute on function public.refresh_user_engagement(uuid, date) to authenticated, service_role;
grant execute on function public.process_daily_streak_rollover(date) to authenticated, service_role;
grant execute on function public.get_weekly_ranking(date, integer) to authenticated, service_role;
