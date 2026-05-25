-- Create push_subscriptions table
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_info jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Grant permissions
grant select, insert, update, delete on public.push_subscriptions to anon, authenticated, service_role;

-- Policies for push_subscriptions
drop policy if exists "Users can view own push subscriptions" on public.push_subscriptions;
create policy "Users can view own push subscriptions"
on public.push_subscriptions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own push subscriptions" on public.push_subscriptions;
create policy "Users can insert own push subscriptions"
on public.push_subscriptions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own push subscriptions" on public.push_subscriptions;
create policy "Users can update own push subscriptions"
on public.push_subscriptions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own push subscriptions" on public.push_subscriptions;
create policy "Users can delete own push subscriptions"
on public.push_subscriptions
for delete
to authenticated
using (auth.uid() = user_id);

-- Create index
create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);


-- Create subject_notifications table
create table if not exists public.subject_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  has_fixed_schedule boolean not null default false,
  custom_reminder_times text[] not null default '{}'::text[],
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subject_notifications_user_subject_unique unique(user_id, subject_id)
);

-- Enable RLS
alter table public.subject_notifications enable row level security;

-- Grant permissions
grant select, insert, update, delete on public.subject_notifications to anon, authenticated, service_role;

-- Policies for subject_notifications
drop policy if exists "Users can view own subject notifications" on public.subject_notifications;
create policy "Users can view own subject notifications"
on public.subject_notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own subject notifications" on public.subject_notifications;
create policy "Users can insert own subject notifications"
on public.subject_notifications
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own subject notifications" on public.subject_notifications;
create policy "Users can update own subject notifications"
on public.subject_notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own subject notifications" on public.subject_notifications;
create policy "Users can delete own subject notifications"
on public.subject_notifications
for delete
to authenticated
using (auth.uid() = user_id);

-- Create index
create index if not exists idx_subject_notifications_user_id on public.subject_notifications(user_id);
create index if not exists idx_subject_notifications_subject_id on public.subject_notifications(subject_id);

-- Add triggers for updated_at
drop trigger if exists update_push_subscriptions_updated_at on public.push_subscriptions;
create trigger update_push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_subject_notifications_updated_at on public.subject_notifications;
create trigger update_subject_notifications_updated_at
  before update on public.subject_notifications
  for each row execute function public.update_updated_at_column();

notify pgrst, 'reload schema';
