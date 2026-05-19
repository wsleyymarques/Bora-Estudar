-- Evolve schedule model with start time + planned minutes + day-level target

-- Per-day planning metadata
CREATE TABLE IF NOT EXISTS public.schedule_day_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  day_note text,
  day_target_minutes integer,
  template_id uuid REFERENCES public.weekly_templates(id) ON DELETE SET NULL,
  is_override boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.schedule_day_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedule day plans" ON public.schedule_day_plans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own schedule day plans" ON public.schedule_day_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own schedule day plans" ON public.schedule_day_plans
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own schedule day plans" ON public.schedule_day_plans
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_schedule_day_plans_user_date ON public.schedule_day_plans(user_id, date);

CREATE TRIGGER update_schedule_day_plans_updated_at
  BEFORE UPDATE ON public.schedule_day_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-item planning fields
ALTER TABLE public.schedule_entries
  ADD COLUMN IF NOT EXISTS start_time text,
  ADD COLUMN IF NOT EXISTS planned_minutes integer,
  ADD COLUMN IF NOT EXISTS item_note text;

ALTER TABLE public.weekly_template_items
  ADD COLUMN IF NOT EXISTS start_time text,
  ADD COLUMN IF NOT EXISTS planned_minutes integer,
  ADD COLUMN IF NOT EXISTS item_note text;

-- Per-day template target (kept in day notes table for backward compatibility)
ALTER TABLE public.weekly_template_day_notes
  ADD COLUMN IF NOT EXISTS target_minutes integer;

-- Validation constraints
ALTER TABLE public.schedule_entries
  ADD CONSTRAINT schedule_entries_planned_minutes_non_negative CHECK (planned_minutes IS NULL OR planned_minutes >= 0);
ALTER TABLE public.weekly_template_items
  ADD CONSTRAINT weekly_template_items_planned_minutes_non_negative CHECK (planned_minutes IS NULL OR planned_minutes >= 0);
ALTER TABLE public.schedule_day_plans
  ADD CONSTRAINT schedule_day_plans_target_minutes_non_negative CHECK (day_target_minutes IS NULL OR day_target_minutes >= 0);
ALTER TABLE public.weekly_template_day_notes
  ADD CONSTRAINT weekly_template_day_notes_target_minutes_non_negative CHECK (target_minutes IS NULL OR target_minutes >= 0);

-- Basic HH:MM format check (24h)
ALTER TABLE public.schedule_entries
  ADD CONSTRAINT schedule_entries_start_time_format CHECK (start_time IS NULL OR start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
ALTER TABLE public.weekly_template_items
  ADD CONSTRAINT weekly_template_items_start_time_format CHECK (start_time IS NULL OR start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
