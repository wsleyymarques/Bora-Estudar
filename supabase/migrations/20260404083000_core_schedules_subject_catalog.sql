-- Core domain upgrade:
-- - Multiple schedules per user
-- - Global + user subject catalog with areas/categories
-- - Template metadata and schedule linkage
-- - Cross-module schedule_id linkage (entries, day plans, sessions, notes, templates)

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- 1) Schedules
-- =========================================================

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

-- Legacy-safe normalization when table already exists with older shape
ALTER TABLE public.study_schedules
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS is_active boolean,
  ADD COLUMN IF NOT EXISTS view_settings jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.study_schedules
SET
  status = COALESCE(status, 'active'),
  start_date = COALESCE(start_date, CURRENT_DATE),
  is_active = COALESCE(is_active, false),
  view_settings = COALESCE(view_settings, '{}'::jsonb),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now())
WHERE
  status IS NULL
  OR start_date IS NULL
  OR is_active IS NULL
  OR view_settings IS NULL
  OR created_at IS NULL
  OR updated_at IS NULL;

ALTER TABLE public.study_schedules
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN start_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN is_active SET DEFAULT false,
  ALTER COLUMN is_active SET NOT NULL,
  ALTER COLUMN view_settings SET DEFAULT '{}'::jsonb,
  ALTER COLUMN view_settings SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.study_schedules
    ADD CONSTRAINT study_schedules_status_check CHECK (status IN ('active', 'archived', 'draft'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.study_schedules
    ADD CONSTRAINT study_schedules_date_order_check CHECK (end_date IS NULL OR end_date >= start_date);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.study_schedules ENABLE ROW LEVEL SECURITY;

-- Explicit grants so PostgREST anon/authenticated can see the relation in schema cache
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.study_schedules TO anon, authenticated, service_role;

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

-- Backfill at least one schedule for users that already have study data
DO $$
DECLARE
  users_union_sql text := '';
BEGIN
  IF to_regclass('public.subjects') IS NOT NULL THEN
    users_union_sql := users_union_sql || CASE WHEN users_union_sql = '' THEN '' ELSE ' UNION ' END ||
      'SELECT DISTINCT user_id FROM public.subjects WHERE user_id IS NOT NULL';
  END IF;

  IF to_regclass('public.schedule_entries') IS NOT NULL THEN
    users_union_sql := users_union_sql || CASE WHEN users_union_sql = '' THEN '' ELSE ' UNION ' END ||
      'SELECT DISTINCT user_id FROM public.schedule_entries WHERE user_id IS NOT NULL';
  END IF;

  IF to_regclass('public.study_sessions') IS NOT NULL THEN
    users_union_sql := users_union_sql || CASE WHEN users_union_sql = '' THEN '' ELSE ' UNION ' END ||
      'SELECT DISTINCT user_id FROM public.study_sessions WHERE user_id IS NOT NULL';
  END IF;

  IF to_regclass('public.weekly_templates') IS NOT NULL THEN
    users_union_sql := users_union_sql || CASE WHEN users_union_sql = '' THEN '' ELSE ' UNION ' END ||
      'SELECT DISTINCT user_id FROM public.weekly_templates WHERE user_id IS NOT NULL';
  END IF;

  IF to_regclass('public.notes') IS NOT NULL THEN
    users_union_sql := users_union_sql || CASE WHEN users_union_sql = '' THEN '' ELSE ' UNION ' END ||
      'SELECT DISTINCT user_id FROM public.notes WHERE user_id IS NOT NULL';
  END IF;

  IF users_union_sql <> '' THEN
    EXECUTE format(
      'WITH known_users AS (%s)
       INSERT INTO public.study_schedules (user_id, name, status, start_date, is_active)
       SELECT ku.user_id, ''Cronograma principal'', ''active'', CURRENT_DATE, true
       FROM known_users ku
       WHERE NOT EXISTS (
         SELECT 1 FROM public.study_schedules ss WHERE ss.user_id = ku.user_id
       );',
      users_union_sql
    );
  END IF;
END $$;

-- =========================================================
-- 2) Global/User subject catalog + taxonomy
-- =========================================================

CREATE TABLE IF NOT EXISTS public.subject_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subject_areas_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT subject_areas_owner_rule CHECK (
    (is_system = true AND created_by IS NULL) OR
    (is_system = false AND created_by IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subject_areas_slug_unique ON public.subject_areas(slug);

ALTER TABLE public.subject_areas ENABLE ROW LEVEL SECURITY;

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
  CONSTRAINT subject_categories_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT subject_categories_owner_rule CHECK (
    (is_system = true AND created_by IS NULL) OR
    (is_system = false AND created_by IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_subject_categories_area_id ON public.subject_categories(area_id);
CREATE INDEX IF NOT EXISTS idx_subject_categories_parent_id ON public.subject_categories(parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subject_categories_slug_unique ON public.subject_categories(slug);

ALTER TABLE public.subject_categories ENABLE ROW LEVEL SECURITY;

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

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS active boolean,
  ADD COLUMN IF NOT EXISTS optional boolean,
  ADD COLUMN IF NOT EXISTS weekly_goal_hours numeric,
  ADD COLUMN IF NOT EXISTS monthly_goal_hours numeric,
  ADD COLUMN IF NOT EXISTS sort_order integer,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.subject_areas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.subject_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.subject_categories(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subjects'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.subjects
      ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

UPDATE public.subjects
SET
  color = COALESCE(color, '#5B8C7E'),
  category = COALESCE(category, 'Geral'),
  active = COALESCE(active, true),
  optional = COALESCE(optional, false),
  weekly_goal_hours = COALESCE(weekly_goal_hours, 0),
  monthly_goal_hours = COALESCE(monthly_goal_hours, 0),
  sort_order = COALESCE(sort_order, 0),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now()),
  origin = COALESCE(origin, 'user'),
  status = COALESCE(status, 'active')
WHERE
  color IS NULL
  OR category IS NULL
  OR active IS NULL
  OR optional IS NULL
  OR weekly_goal_hours IS NULL
  OR monthly_goal_hours IS NULL
  OR sort_order IS NULL
  OR created_at IS NULL
  OR updated_at IS NULL
  OR origin IS NULL
  OR status IS NULL;

ALTER TABLE public.subjects
  ALTER COLUMN color SET DEFAULT '#5B8C7E',
  ALTER COLUMN active SET DEFAULT true,
  ALTER COLUMN optional SET DEFAULT false,
  ALTER COLUMN weekly_goal_hours SET DEFAULT 0,
  ALTER COLUMN monthly_goal_hours SET DEFAULT 0,
  ALTER COLUMN sort_order SET DEFAULT 0,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN origin SET DEFAULT 'user',
  ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE public.subjects
  ALTER COLUMN color SET NOT NULL,
  ALTER COLUMN active SET NOT NULL,
  ALTER COLUMN optional SET NOT NULL,
  ALTER COLUMN weekly_goal_hours SET NOT NULL,
  ALTER COLUMN monthly_goal_hours SET NOT NULL,
  ALTER COLUMN sort_order SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN origin SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.subjects
    ADD CONSTRAINT subjects_origin_check CHECK (origin IN ('global', 'user'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.subjects
    ADD CONSTRAINT subjects_status_check CHECK (status IN ('active', 'archived', 'draft'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.subjects
    ADD CONSTRAINT subjects_origin_owner_rule CHECK (
      (origin = 'global' AND user_id IS NULL) OR
      (origin = 'user' AND user_id IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_subjects_origin ON public.subjects(origin);
CREATE INDEX IF NOT EXISTS idx_subjects_area_id ON public.subjects(area_id);
CREATE INDEX IF NOT EXISTS idx_subjects_category_id ON public.subjects(category_id);
CREATE INDEX IF NOT EXISTS idx_subjects_subcategory_id ON public.subjects(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user_id_name ON public.subjects(user_id, name);
CREATE INDEX IF NOT EXISTS idx_subjects_name_lower ON public.subjects((lower(name)));

DROP POLICY IF EXISTS "Users can view own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can insert own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can update own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can delete own subjects" ON public.subjects;
DROP POLICY IF EXISTS subjects_select_visible ON public.subjects;
DROP POLICY IF EXISTS subjects_insert_own ON public.subjects;
DROP POLICY IF EXISTS subjects_update_own ON public.subjects;
DROP POLICY IF EXISTS subjects_delete_own ON public.subjects;

CREATE POLICY subjects_select_visible ON public.subjects
  FOR SELECT USING (origin = 'global' OR auth.uid() = user_id);

CREATE POLICY subjects_insert_own ON public.subjects
  FOR INSERT WITH CHECK (
    (origin = 'user' AND auth.uid() = user_id)
    OR
    (origin = 'global' AND auth.role() = 'service_role')
  );

CREATE POLICY subjects_update_own ON public.subjects
  FOR UPDATE USING (origin = 'user' AND auth.uid() = user_id)
  WITH CHECK (origin = 'user' AND auth.uid() = user_id);

CREATE POLICY subjects_delete_own ON public.subjects
  FOR DELETE USING (origin = 'user' AND auth.uid() = user_id);

-- Seed base taxonomy
INSERT INTO public.subject_areas (name, slug, description, is_system, created_by)
VALUES
  ('Juridicas', 'juridicas', 'Area de disciplinas juridicas.', true, NULL),
  ('Exatas', 'exatas', 'Area de disciplinas exatas e logica.', true, NULL),
  ('Linguagens', 'linguagens', 'Area de linguagens, portugues e redacao.', true, NULL)
ON CONFLICT (slug) DO NOTHING;

WITH areas AS (
  SELECT id, slug FROM public.subject_areas WHERE slug IN ('juridicas', 'exatas', 'linguagens')
)
INSERT INTO public.subject_categories (area_id, parent_id, name, slug, description, is_system, created_by)
SELECT a.id, NULL, v.name, v.slug, v.description, true, NULL
FROM (
  VALUES
    ('juridicas', 'Direito Constitucional', 'direito-constitucional', 'Categoria juridica'),
    ('juridicas', 'Direito Penal', 'direito-penal', 'Categoria juridica'),
    ('juridicas', 'Direito Processual Penal', 'direito-processual-penal', 'Categoria juridica'),
    ('exatas', 'Matematica', 'matematica', 'Categoria de exatas'),
    ('exatas', 'Raciocinio Logico', 'raciocinio-logico', 'Categoria de exatas'),
    ('linguagens', 'Portugues', 'portugues', 'Categoria de linguagens'),
    ('linguagens', 'Redacao', 'redacao', 'Categoria de linguagens')
) AS v(area_slug, name, slug, description)
JOIN areas a ON a.slug = v.area_slug
ON CONFLICT (slug) DO NOTHING;

WITH categories AS (
  SELECT c.id, c.slug AS category_slug, a.slug AS area_slug
  FROM public.subject_categories c
  LEFT JOIN public.subject_areas a ON a.id = c.area_id
),
global_subjects(name, slug, color, area_slug, category_slug) AS (
  VALUES
    ('Matematica', 'matematica', '#5B8C7E', 'exatas', 'matematica'),
    ('Portugues', 'portugues', '#6B9BD2', 'linguagens', 'portugues'),
    ('Direito Constitucional', 'direito-constitucional', '#E8A838', 'juridicas', 'direito-constitucional'),
    ('Direito Penal', 'direito-penal', '#C47ABF', 'juridicas', 'direito-penal'),
    ('Informatica', 'informatica', '#7986CB', 'exatas', 'raciocinio-logico'),
    ('Redacao', 'redacao', '#FF8A65', 'linguagens', 'redacao')
)
INSERT INTO public.subjects (
  user_id,
  name,
  slug,
  color,
  category,
  active,
  optional,
  weekly_goal_hours,
  monthly_goal_hours,
  sort_order,
  description,
  icon,
  origin,
  status,
  area_id,
  category_id,
  subcategory_id
)
SELECT
  NULL,
  gs.name,
  gs.slug,
  gs.color,
  INITCAP(gs.area_slug),
  true,
  false,
  0,
  0,
  0,
  'Materia global do catalogo base',
  NULL,
  'global',
  'active',
  a.id,
  c.id,
  NULL
FROM global_subjects gs
LEFT JOIN public.subject_areas a ON a.slug = gs.area_slug
LEFT JOIN categories c ON c.category_slug = gs.category_slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.subjects s
  WHERE s.origin = 'global'
    AND lower(s.name) = lower(gs.name)
);

-- =========================================================
-- 3) Link operational tables to schedule_id
-- =========================================================

DO $$
BEGIN
  IF to_regclass('public.schedule_entries') IS NOT NULL THEN
    ALTER TABLE public.schedule_entries
      ADD COLUMN IF NOT EXISTS schedule_id uuid;
  END IF;

  IF to_regclass('public.schedule_day_plans') IS NOT NULL THEN
    ALTER TABLE public.schedule_day_plans
      ADD COLUMN IF NOT EXISTS schedule_id uuid;
  END IF;

  IF to_regclass('public.study_sessions') IS NOT NULL THEN
    ALTER TABLE public.study_sessions
      ADD COLUMN IF NOT EXISTS schedule_id uuid;
  END IF;

  IF to_regclass('public.weekly_templates') IS NOT NULL THEN
    ALTER TABLE public.weekly_templates
      ADD COLUMN IF NOT EXISTS schedule_id uuid,
      ADD COLUMN IF NOT EXISTS description text,
      ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'weekly',
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
  END IF;

  IF to_regclass('public.notes') IS NOT NULL THEN
    ALTER TABLE public.notes
      ADD COLUMN IF NOT EXISTS schedule_id uuid;
  END IF;
END $$;

-- Refresh PostgREST cache only after all DDL statements have finished
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  IF to_regclass('public.weekly_templates') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.weekly_templates
        ADD CONSTRAINT weekly_templates_type_check CHECK (type IN ('weekly', 'monthly', 'custom'));
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_column THEN NULL;
    END;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.weekly_templates') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.weekly_templates
        ADD CONSTRAINT weekly_templates_status_check CHECK (status IN ('active', 'archived', 'draft'));
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_column THEN NULL;
    END;
  END IF;
END $$;

-- Backfill schedule_id using user's active schedule
DO $$
BEGIN
  IF to_regclass('public.schedule_entries') IS NOT NULL THEN
    UPDATE public.schedule_entries se
    SET schedule_id = ss.id
    FROM public.study_schedules ss
    WHERE se.user_id = ss.user_id
      AND ss.is_active = true
      AND se.schedule_id IS NULL;
  END IF;

  IF to_regclass('public.schedule_day_plans') IS NOT NULL THEN
    UPDATE public.schedule_day_plans sdp
    SET schedule_id = ss.id
    FROM public.study_schedules ss
    WHERE sdp.user_id = ss.user_id
      AND ss.is_active = true
      AND sdp.schedule_id IS NULL;
  END IF;

  IF to_regclass('public.study_sessions') IS NOT NULL THEN
    UPDATE public.study_sessions ses
    SET schedule_id = ss.id
    FROM public.study_schedules ss
    WHERE ses.user_id = ss.user_id
      AND ss.is_active = true
      AND ses.schedule_id IS NULL;
  END IF;

  IF to_regclass('public.weekly_templates') IS NOT NULL THEN
    UPDATE public.weekly_templates wt
    SET schedule_id = ss.id
    FROM public.study_schedules ss
    WHERE wt.user_id = ss.user_id
      AND ss.is_active = true
      AND wt.schedule_id IS NULL;
  END IF;

  IF to_regclass('public.notes') IS NOT NULL THEN
    UPDATE public.notes n
    SET schedule_id = ss.id
    FROM public.study_schedules ss
    WHERE n.user_id = ss.user_id
      AND ss.is_active = true
      AND n.schedule_id IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.schedule_entries') IS NOT NULL THEN
    ALTER TABLE public.schedule_entries
      DROP CONSTRAINT IF EXISTS schedule_entries_schedule_id_fkey;
    ALTER TABLE public.schedule_entries
      ADD CONSTRAINT schedule_entries_schedule_id_fkey
      FOREIGN KEY (schedule_id)
      REFERENCES public.study_schedules(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.schedule_day_plans') IS NOT NULL THEN
    ALTER TABLE public.schedule_day_plans
      DROP CONSTRAINT IF EXISTS schedule_day_plans_schedule_id_fkey;
    ALTER TABLE public.schedule_day_plans
      ADD CONSTRAINT schedule_day_plans_schedule_id_fkey
      FOREIGN KEY (schedule_id)
      REFERENCES public.study_schedules(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.study_sessions') IS NOT NULL THEN
    ALTER TABLE public.study_sessions
      DROP CONSTRAINT IF EXISTS study_sessions_schedule_id_fkey;
    ALTER TABLE public.study_sessions
      ADD CONSTRAINT study_sessions_schedule_id_fkey
      FOREIGN KEY (schedule_id)
      REFERENCES public.study_schedules(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.weekly_templates') IS NOT NULL THEN
    ALTER TABLE public.weekly_templates
      DROP CONSTRAINT IF EXISTS weekly_templates_schedule_id_fkey;
    ALTER TABLE public.weekly_templates
      ADD CONSTRAINT weekly_templates_schedule_id_fkey
      FOREIGN KEY (schedule_id)
      REFERENCES public.study_schedules(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.notes') IS NOT NULL THEN
    ALTER TABLE public.notes
      DROP CONSTRAINT IF EXISTS notes_schedule_id_fkey;
    ALTER TABLE public.notes
      ADD CONSTRAINT notes_schedule_id_fkey
      FOREIGN KEY (schedule_id)
      REFERENCES public.study_schedules(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.schedule_day_plans') IS NOT NULL THEN
    ALTER TABLE public.schedule_day_plans
      DROP CONSTRAINT IF EXISTS schedule_day_plans_user_id_date_key;

    BEGIN
      ALTER TABLE public.schedule_day_plans
        ADD CONSTRAINT schedule_day_plans_user_schedule_date_key
        UNIQUE (user_id, schedule_id, date);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.schedule_entries') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_schedule_entries_user_schedule_date
      ON public.schedule_entries(user_id, schedule_id, date);
  END IF;

  IF to_regclass('public.schedule_day_plans') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_schedule_day_plans_user_schedule_date
      ON public.schedule_day_plans(user_id, schedule_id, date);
  END IF;

  IF to_regclass('public.study_sessions') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_study_sessions_user_schedule_date
      ON public.study_sessions(user_id, schedule_id, date);
  END IF;

  IF to_regclass('public.notes') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_notes_user_schedule_ref
      ON public.notes(user_id, schedule_id, reference_date);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.weekly_templates') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'weekly_templates'
        AND column_name = 'status'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_weekly_templates_user_schedule
        ON public.weekly_templates(user_id, schedule_id, status);
    ELSE
      CREATE INDEX IF NOT EXISTS idx_weekly_templates_user_schedule
        ON public.weekly_templates(user_id, schedule_id);
    END IF;
  END IF;
END $$;

-- Guarantee schedule ownership consistency in linked tables
CREATE OR REPLACE FUNCTION public.validate_schedule_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  schedule_owner uuid;
BEGIN
  IF NEW.schedule_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO schedule_owner
  FROM public.study_schedules
  WHERE id = NEW.schedule_id;

  IF schedule_owner IS NULL THEN
    RAISE EXCEPTION 'Schedule % not found', NEW.schedule_id;
  END IF;

  IF NEW.user_id <> schedule_owner THEN
    RAISE EXCEPTION 'schedule_id must belong to row user_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.default_schedule_for_user()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.schedule_id IS NULL THEN
    SELECT ss.id
    INTO NEW.schedule_id
    FROM public.study_schedules ss
    WHERE ss.user_id = NEW.user_id
      AND ss.is_active = true
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.schedule_entries') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS schedule_entries_default_schedule_trigger ON public.schedule_entries;
    CREATE TRIGGER schedule_entries_default_schedule_trigger
      BEFORE INSERT OR UPDATE ON public.schedule_entries
      FOR EACH ROW EXECUTE FUNCTION public.default_schedule_for_user();

    DROP TRIGGER IF EXISTS schedule_entries_validate_schedule_owner_trigger ON public.schedule_entries;
    CREATE TRIGGER schedule_entries_validate_schedule_owner_trigger
      BEFORE INSERT OR UPDATE ON public.schedule_entries
      FOR EACH ROW EXECUTE FUNCTION public.validate_schedule_owner();
  END IF;

  IF to_regclass('public.schedule_day_plans') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS schedule_day_plans_default_schedule_trigger ON public.schedule_day_plans;
    CREATE TRIGGER schedule_day_plans_default_schedule_trigger
      BEFORE INSERT OR UPDATE ON public.schedule_day_plans
      FOR EACH ROW EXECUTE FUNCTION public.default_schedule_for_user();

    DROP TRIGGER IF EXISTS schedule_day_plans_validate_schedule_owner_trigger ON public.schedule_day_plans;
    CREATE TRIGGER schedule_day_plans_validate_schedule_owner_trigger
      BEFORE INSERT OR UPDATE ON public.schedule_day_plans
      FOR EACH ROW EXECUTE FUNCTION public.validate_schedule_owner();
  END IF;

  IF to_regclass('public.study_sessions') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS study_sessions_default_schedule_trigger ON public.study_sessions;
    CREATE TRIGGER study_sessions_default_schedule_trigger
      BEFORE INSERT OR UPDATE ON public.study_sessions
      FOR EACH ROW EXECUTE FUNCTION public.default_schedule_for_user();

    DROP TRIGGER IF EXISTS study_sessions_validate_schedule_owner_trigger ON public.study_sessions;
    CREATE TRIGGER study_sessions_validate_schedule_owner_trigger
      BEFORE INSERT OR UPDATE ON public.study_sessions
      FOR EACH ROW EXECUTE FUNCTION public.validate_schedule_owner();
  END IF;

  IF to_regclass('public.weekly_templates') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS weekly_templates_default_schedule_trigger ON public.weekly_templates;
    CREATE TRIGGER weekly_templates_default_schedule_trigger
      BEFORE INSERT OR UPDATE ON public.weekly_templates
      FOR EACH ROW EXECUTE FUNCTION public.default_schedule_for_user();

    DROP TRIGGER IF EXISTS weekly_templates_validate_schedule_owner_trigger ON public.weekly_templates;
    CREATE TRIGGER weekly_templates_validate_schedule_owner_trigger
      BEFORE INSERT OR UPDATE ON public.weekly_templates
      FOR EACH ROW EXECUTE FUNCTION public.validate_schedule_owner();
  END IF;

  IF to_regclass('public.notes') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS notes_default_schedule_trigger ON public.notes;
    CREATE TRIGGER notes_default_schedule_trigger
      BEFORE INSERT OR UPDATE ON public.notes
      FOR EACH ROW EXECUTE FUNCTION public.default_schedule_for_user();

    DROP TRIGGER IF EXISTS notes_validate_schedule_owner_trigger ON public.notes;
    CREATE TRIGGER notes_validate_schedule_owner_trigger
      BEFORE INSERT OR UPDATE ON public.notes
      FOR EACH ROW EXECUTE FUNCTION public.validate_schedule_owner();
  END IF;
END $$;
