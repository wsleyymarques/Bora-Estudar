create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  exam_name text,
  board text,
  role text,
  description text,
  image_url text,
  review_interval_days integer not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_study_plans_user_id on public.study_plans(user_id);
create index if not exists idx_study_plans_created_at on public.study_plans(created_at desc);

notify pgrst, 'reload schema';
