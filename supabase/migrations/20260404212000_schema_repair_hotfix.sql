-- Emergency schema repair for missing PostgREST relations
-- Fixes PGRST205 for core tables expected by frontend.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- -----------------------------
-- Theme preferences
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.user_theme_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  template_key text NOT NULL DEFAULT 'padrao',
  mode text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_theme_preferences_mode_check CHECK (mode IN ('light', 'dark', 'system'))
);

ALTER TABLE public.user_theme_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_theme_preferences TO anon, authenticated, service_role;

DROP POLICY IF EXISTS user_theme_preferences_select_own ON public.user_theme_preferences;
CREATE POLICY user_theme_preferences_select_own ON public.user_theme_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_theme_preferences_insert_own ON public.user_theme_preferences;
CREATE POLICY user_theme_preferences_insert_own ON public.user_theme_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_theme_preferences_update_own ON public.user_theme_preferences;
CREATE POLICY user_theme_preferences_update_own ON public.user_theme_preferences
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_theme_preferences_delete_own ON public.user_theme_preferences;
CREATE POLICY user_theme_preferences_delete_own ON public.user_theme_preferences
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_theme_preferences_updated_at ON public.user_theme_preferences;
CREATE TRIGGER update_user_theme_preferences_updated_at
  BEFORE UPDATE ON public.user_theme_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------
-- Schedules
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.study_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT false,
  view_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT study_schedules_status_check CHECK (status IN ('active', 'archived', 'draft')),
  CONSTRAINT study_schedules_date_order_check CHECK (end_date IS NULL OR end_date >= start_date)
);

ALTER TABLE public.study_schedules ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_schedules TO anon, authenticated, service_role;

DROP POLICY IF EXISTS study_schedules_select_own ON public.study_schedules;
CREATE POLICY study_schedules_select_own ON public.study_schedules
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS study_schedules_insert_own ON public.study_schedules;
CREATE POLICY study_schedules_insert_own ON public.study_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS study_schedules_update_own ON public.study_schedules;
CREATE POLICY study_schedules_update_own ON public.study_schedules
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS study_schedules_delete_own ON public.study_schedules;
CREATE POLICY study_schedules_delete_own ON public.study_schedules
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_study_schedules_user_id ON public.study_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_study_schedules_user_status ON public.study_schedules(user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_study_schedules_single_active
  ON public.study_schedules(user_id)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS update_study_schedules_updated_at ON public.study_schedules;
CREATE TRIGGER update_study_schedules_updated_at
  BEFORE UPDATE ON public.study_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.ensure_single_active_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active THEN
    UPDATE public.study_schedules
    SET is_active = false
    WHERE user_id = NEW.user_id
      AND id <> COALESCE(NEW.id, gen_random_uuid())
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_single_active_schedule_trigger ON public.study_schedules;
CREATE TRIGGER ensure_single_active_schedule_trigger
  BEFORE INSERT OR UPDATE ON public.study_schedules
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_active_schedule();

-- -----------------------------
-- Subject taxonomy
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.subject_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subject_areas_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subject_areas_slug_unique ON public.subject_areas(slug);
ALTER TABLE public.subject_areas ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subject_areas TO anon, authenticated, service_role;

DROP POLICY IF EXISTS subject_areas_select_visible ON public.subject_areas;
CREATE POLICY subject_areas_select_visible ON public.subject_areas
  FOR SELECT USING (is_system = true OR created_by = auth.uid());

DROP POLICY IF EXISTS subject_areas_insert_own ON public.subject_areas;
CREATE POLICY subject_areas_insert_own ON public.subject_areas
  FOR INSERT WITH CHECK (created_by = auth.uid() AND is_system = false);

DROP POLICY IF EXISTS subject_areas_update_own ON public.subject_areas;
CREATE POLICY subject_areas_update_own ON public.subject_areas
  FOR UPDATE USING (created_by = auth.uid() AND is_system = false)
  WITH CHECK (created_by = auth.uid() AND is_system = false);

DROP POLICY IF EXISTS subject_areas_delete_own ON public.subject_areas;
CREATE POLICY subject_areas_delete_own ON public.subject_areas
  FOR DELETE USING (created_by = auth.uid() AND is_system = false);

DROP TRIGGER IF EXISTS update_subject_areas_updated_at ON public.subject_areas;
CREATE TRIGGER update_subject_areas_updated_at
  BEFORE UPDATE ON public.subject_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.subject_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid REFERENCES public.subject_areas(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.subject_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subject_categories_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subject_categories_slug_unique ON public.subject_categories(slug);
CREATE INDEX IF NOT EXISTS idx_subject_categories_area_id ON public.subject_categories(area_id);
ALTER TABLE public.subject_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subject_categories TO anon, authenticated, service_role;

DROP POLICY IF EXISTS subject_categories_select_visible ON public.subject_categories;
CREATE POLICY subject_categories_select_visible ON public.subject_categories
  FOR SELECT USING (is_system = true OR created_by = auth.uid());

DROP POLICY IF EXISTS subject_categories_insert_own ON public.subject_categories;
CREATE POLICY subject_categories_insert_own ON public.subject_categories
  FOR INSERT WITH CHECK (created_by = auth.uid() AND is_system = false);

DROP POLICY IF EXISTS subject_categories_update_own ON public.subject_categories;
CREATE POLICY subject_categories_update_own ON public.subject_categories
  FOR UPDATE USING (created_by = auth.uid() AND is_system = false)
  WITH CHECK (created_by = auth.uid() AND is_system = false);

DROP POLICY IF EXISTS subject_categories_delete_own ON public.subject_categories;
CREATE POLICY subject_categories_delete_own ON public.subject_categories
  FOR DELETE USING (created_by = auth.uid() AND is_system = false);

DROP TRIGGER IF EXISTS update_subject_categories_updated_at ON public.subject_categories;
CREATE TRIGGER update_subject_categories_updated_at
  BEFORE UPDATE ON public.subject_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------
-- Study session pauses (guarded by study_sessions)
-- -----------------------------
DO $$
BEGIN
  IF to_regclass('public.study_sessions') IS NOT NULL THEN
    ALTER TABLE public.study_sessions
      ADD COLUMN IF NOT EXISTS session_mode text NOT NULL DEFAULT 'manual',
      ADD COLUMN IF NOT EXISTS pomodoro_phase text,
      ADD COLUMN IF NOT EXISTS pomodoro_cycle integer,
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
      ADD COLUMN IF NOT EXISTS started_at timestamptz,
      ADD COLUMN IF NOT EXISTS ended_at timestamptz,
      ADD COLUMN IF NOT EXISTS actual_duration_seconds integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_pause_seconds integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS clock_duration_seconds integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS schedule_entry_id uuid,
      ADD COLUMN IF NOT EXISTS schedule_date date,
      ADD COLUMN IF NOT EXISTS planned_start_time text,
      ADD COLUMN IF NOT EXISTS planned_minutes integer,
      ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'tracker',
      ADD COLUMN IF NOT EXISTS is_focus_session boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO anon, authenticated, service_role;

    CREATE INDEX IF NOT EXISTS idx_study_sessions_started_at ON public.study_sessions(user_id, started_at DESC);

    CREATE TABLE IF NOT EXISTS public.study_session_pauses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      pause_started_at timestamptz NOT NULL,
      pause_ended_at timestamptz,
      duration_seconds integer,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT study_session_pauses_duration_non_negative CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
      CONSTRAINT study_session_pauses_time_order CHECK (pause_ended_at IS NULL OR pause_ended_at >= pause_started_at)
    );

    ALTER TABLE public.study_session_pauses ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_session_pauses TO anon, authenticated, service_role;

    DROP POLICY IF EXISTS study_session_pauses_select_own ON public.study_session_pauses;
    CREATE POLICY study_session_pauses_select_own ON public.study_session_pauses
      FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS study_session_pauses_insert_own ON public.study_session_pauses;
    CREATE POLICY study_session_pauses_insert_own ON public.study_session_pauses
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS study_session_pauses_update_own ON public.study_session_pauses;
    CREATE POLICY study_session_pauses_update_own ON public.study_session_pauses
      FOR UPDATE USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS study_session_pauses_delete_own ON public.study_session_pauses;
    CREATE POLICY study_session_pauses_delete_own ON public.study_session_pauses
      FOR DELETE USING (auth.uid() = user_id);

    CREATE INDEX IF NOT EXISTS idx_study_session_pauses_session_id ON public.study_session_pauses(session_id);
    CREATE INDEX IF NOT EXISTS idx_study_session_pauses_user_started_at ON public.study_session_pauses(user_id, pause_started_at DESC);

    DROP TRIGGER IF EXISTS update_study_session_pauses_updated_at ON public.study_session_pauses;
    CREATE TRIGGER update_study_session_pauses_updated_at
      BEFORE UPDATE ON public.study_session_pauses
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
