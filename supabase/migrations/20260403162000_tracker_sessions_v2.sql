-- Tracker V2: real execution timeline, pause segments and schedule linkage

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1) Evolve study_sessions with planned vs executed fields
ALTER TABLE public.study_sessions
  ADD COLUMN IF NOT EXISTS date date,
  ADD COLUMN IF NOT EXISTS start_time text,
  ADD COLUMN IF NOT EXISTS end_time text,
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS note text,
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

UPDATE public.study_sessions
SET date = COALESCE(date, (started_at AT TIME ZONE 'UTC')::date, CURRENT_DATE)
WHERE date IS NULL;

UPDATE public.study_sessions
SET start_time = COALESCE(start_time, to_char(started_at AT TIME ZONE 'UTC', 'HH24:MI'))
WHERE start_time IS NULL
  AND started_at IS NOT NULL;

UPDATE public.study_sessions
SET end_time = COALESCE(end_time, to_char(ended_at AT TIME ZONE 'UTC', 'HH24:MI'))
WHERE end_time IS NULL
  AND ended_at IS NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.schedule_entries') IS NOT NULL THEN
    ALTER TABLE public.study_sessions
      DROP CONSTRAINT IF EXISTS study_sessions_schedule_entry_id_fkey;

    ALTER TABLE public.study_sessions
      ADD CONSTRAINT study_sessions_schedule_entry_id_fkey
      FOREIGN KEY (schedule_entry_id)
      REFERENCES public.schedule_entries(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  ALTER TABLE public.study_sessions
    ADD CONSTRAINT study_sessions_session_mode_check
    CHECK (session_mode IN ('manual', 'stopwatch', 'pomodoro'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.study_sessions
    ADD CONSTRAINT study_sessions_pomodoro_phase_check
    CHECK (pomodoro_phase IS NULL OR pomodoro_phase IN ('focus', 'short_break', 'long_break'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.study_sessions
    ADD CONSTRAINT study_sessions_status_check
    CHECK (status IN ('active', 'paused', 'completed', 'abandoned'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.study_sessions
    ADD CONSTRAINT study_sessions_actual_duration_seconds_non_negative
    CHECK (actual_duration_seconds >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.study_sessions
    ADD CONSTRAINT study_sessions_total_pause_seconds_non_negative
    CHECK (total_pause_seconds >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.study_sessions
    ADD CONSTRAINT study_sessions_clock_duration_seconds_non_negative
    CHECK (clock_duration_seconds >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.study_sessions
    ADD CONSTRAINT study_sessions_planned_minutes_non_negative
    CHECK (planned_minutes IS NULL OR planned_minutes >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.study_sessions
    ADD CONSTRAINT study_sessions_planned_start_time_format
    CHECK (planned_start_time IS NULL OR planned_start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.study_sessions
    ADD CONSTRAINT study_sessions_source_check
    CHECK (source IN ('tracker', 'manual', 'import', 'pomodoro'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Best-effort backfill from legacy rows
DO $$
DECLARE
  has_date boolean;
  has_start_time boolean;
  has_end_time boolean;
  has_duration_minutes boolean;
  started_expr text;
  ended_expr text;
  duration_expr text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'study_sessions' AND column_name = 'date'
  ) INTO has_date;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'study_sessions' AND column_name = 'start_time'
  ) INTO has_start_time;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'study_sessions' AND column_name = 'end_time'
  ) INTO has_end_time;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'study_sessions' AND column_name = 'duration_minutes'
  ) INTO has_duration_minutes;

  IF has_date AND has_start_time THEN
    started_expr := $s$
      CASE
        WHEN start_time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
          THEN (date::text || ' ' || start_time::text || ':00')::timestamp AT TIME ZONE 'UTC'
        WHEN start_time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$'
          THEN (date::text || ' ' || start_time::text)::timestamp AT TIME ZONE 'UTC'
        ELSE date::timestamp AT TIME ZONE 'UTC'
      END
    $s$;
  ELSIF has_date THEN
    started_expr := 'date::timestamp AT TIME ZONE ''UTC''';
  ELSE
    started_expr := 'NULL::timestamptz';
  END IF;

  IF has_date AND has_end_time THEN
    ended_expr := $e$
      CASE
        WHEN end_time IS NOT NULL AND end_time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
          THEN (date::text || ' ' || end_time::text || ':00')::timestamp AT TIME ZONE 'UTC'
        WHEN end_time IS NOT NULL AND end_time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$'
          THEN (date::text || ' ' || end_time::text)::timestamp AT TIME ZONE 'UTC'
        ELSE NULL
      END
    $e$;
  ELSE
    ended_expr := 'NULL::timestamptz';
  END IF;

  IF has_duration_minutes THEN
    duration_expr := 'GREATEST(COALESCE(duration_minutes, 0), 0) * 60';
  ELSE
    duration_expr := '0';
  END IF;

  EXECUTE format(
    'UPDATE public.study_sessions
      SET
        started_at = COALESCE(started_at, %s),
        ended_at = COALESCE(ended_at, %s),
        actual_duration_seconds = CASE
          WHEN actual_duration_seconds > 0 THEN actual_duration_seconds
          ELSE %s
        END,
        clock_duration_seconds = CASE
          WHEN clock_duration_seconds > 0 THEN clock_duration_seconds
          WHEN actual_duration_seconds > 0 THEN actual_duration_seconds
          ELSE %s
        END,
        source = COALESCE(source, ''manual'')
      WHERE true;',
    started_expr,
    ended_expr,
    duration_expr,
    duration_expr
  );
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'study_sessions' AND column_name = 'user_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'study_sessions' AND column_name = 'date'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'study_sessions' AND column_name = 'session_mode'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date_mode ON public.study_sessions(user_id, date, session_mode);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'study_sessions' AND column_name = 'schedule_entry_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_study_sessions_schedule_entry_id ON public.study_sessions(schedule_entry_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'study_sessions' AND column_name = 'user_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'study_sessions' AND column_name = 'started_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_study_sessions_started_at ON public.study_sessions(user_id, started_at DESC);
  END IF;
END $$;

-- 2) Pause segments table
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

CREATE OR REPLACE FUNCTION public.validate_study_session_pause_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  session_owner uuid;
BEGIN
  SELECT s.user_id INTO session_owner
  FROM public.study_sessions s
  WHERE s.id = NEW.session_id;

  IF session_owner IS NULL THEN
    RAISE EXCEPTION 'Session % not found', NEW.session_id;
  END IF;

  IF NEW.user_id <> session_owner THEN
    RAISE EXCEPTION 'Pause user_id must match session owner';
  END IF;

  IF NEW.pause_ended_at IS NOT NULL AND NEW.duration_seconds IS NULL THEN
    NEW.duration_seconds := GREATEST(EXTRACT(EPOCH FROM (NEW.pause_ended_at - NEW.pause_started_at))::integer, 0);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_study_session_pause_owner_trigger ON public.study_session_pauses;
CREATE TRIGGER validate_study_session_pause_owner_trigger
  BEFORE INSERT OR UPDATE ON public.study_session_pauses
  FOR EACH ROW EXECUTE FUNCTION public.validate_study_session_pause_owner();

DROP TRIGGER IF EXISTS update_study_session_pauses_updated_at ON public.study_session_pauses;
CREATE TRIGGER update_study_session_pauses_updated_at
  BEFORE UPDATE ON public.study_session_pauses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
