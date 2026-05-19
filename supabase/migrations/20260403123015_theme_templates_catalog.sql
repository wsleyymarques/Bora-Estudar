-- Theme templates catalog (system defaults + user templates)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.theme_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  preview_colors text[] NOT NULL DEFAULT ARRAY[]::text[],
  light_tokens jsonb NOT NULL,
  dark_tokens jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT theme_templates_key_format CHECK (key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT theme_templates_tokens_object CHECK (
    jsonb_typeof(light_tokens) = 'object' AND jsonb_typeof(dark_tokens) = 'object'
  ),
  CONSTRAINT theme_templates_owner_rule CHECK (
    (is_system = true AND owner_user_id IS NULL) OR
    (is_system = false AND owner_user_id IS NOT NULL)
  )
);

ALTER TABLE public.theme_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS theme_templates_select_visible ON public.theme_templates;
CREATE POLICY theme_templates_select_visible ON public.theme_templates
  FOR SELECT USING (is_system = true OR owner_user_id = auth.uid());

DROP POLICY IF EXISTS theme_templates_insert_own ON public.theme_templates;
CREATE POLICY theme_templates_insert_own ON public.theme_templates
  FOR INSERT WITH CHECK (owner_user_id = auth.uid() AND is_system = false);

DROP POLICY IF EXISTS theme_templates_update_own ON public.theme_templates;
CREATE POLICY theme_templates_update_own ON public.theme_templates
  FOR UPDATE
  USING (owner_user_id = auth.uid() AND is_system = false)
  WITH CHECK (owner_user_id = auth.uid() AND is_system = false);

DROP POLICY IF EXISTS theme_templates_delete_own ON public.theme_templates;
CREATE POLICY theme_templates_delete_own ON public.theme_templates
  FOR DELETE USING (owner_user_id = auth.uid() AND is_system = false);

CREATE INDEX IF NOT EXISTS idx_theme_templates_owner_user_id ON public.theme_templates(owner_user_id);

DROP TRIGGER IF EXISTS update_theme_templates_updated_at ON public.theme_templates;
CREATE TRIGGER update_theme_templates_updated_at
  BEFORE UPDATE ON public.theme_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.theme_templates (
  key,
  name,
  description,
  is_system,
  owner_user_id,
  preview_colors,
  light_tokens,
  dark_tokens
)
VALUES
(
  'padrao',
  'Padrao',
  'Paleta azul e verde com contraste limpo.',
  true,
  NULL,
  ARRAY['#f7fbff', '#2f6fe4', '#33a07f'],
  jsonb_build_object(
    'background', '210 45% 98%',
    'foreground', '220 24% 16%',
    'card', '0 0% 100%',
    'card-foreground', '220 24% 16%',
    'primary', '212 73% 48%',
    'primary-foreground', '0 0% 100%',
    'secondary', '210 26% 94%',
    'secondary-foreground', '220 22% 22%',
    'muted', '210 24% 95%',
    'muted-foreground', '220 10% 46%',
    'accent', '158 45% 42%',
    'accent-foreground', '0 0% 100%',
    'border', '210 20% 88%',
    'input', '210 20% 88%',
    'ring', '212 73% 48%',
    'sidebar-background', '215 30% 14%',
    'sidebar-foreground', '210 20% 88%',
    'sidebar-accent', '215 22% 20%',
    'sidebar-accent-foreground', '0 0% 100%',
    'sidebar-border', '215 18% 26%',
    'workspace-bg-a', '210 50% 97%',
    'workspace-bg-b', '197 36% 92%',
    'workspace-panel', '0 0% 100%',
    'workspace-panel-foreground', '220 24% 16%',
    'workspace-sidebar', '215 30% 14%',
    'workspace-sidebar-foreground', '210 20% 88%'
  ),
  jsonb_build_object(
    'background', '222 28% 11%',
    'foreground', '210 25% 92%',
    'card', '223 24% 13%',
    'card-foreground', '210 25% 92%',
    'primary', '212 78% 62%',
    'primary-foreground', '222 35% 10%',
    'secondary', '222 16% 18%',
    'secondary-foreground', '210 20% 88%',
    'muted', '222 14% 18%',
    'muted-foreground', '215 12% 64%',
    'accent', '158 50% 48%',
    'accent-foreground', '222 35% 10%',
    'border', '222 12% 24%',
    'input', '222 12% 24%',
    'ring', '212 78% 62%',
    'sidebar-background', '222 33% 10%',
    'sidebar-foreground', '210 18% 86%',
    'sidebar-accent', '221 20% 16%',
    'sidebar-accent-foreground', '210 20% 92%',
    'sidebar-border', '222 14% 22%',
    'workspace-bg-a', '223 20% 13%',
    'workspace-bg-b', '213 18% 10%',
    'workspace-panel', '223 22% 13%',
    'workspace-panel-foreground', '210 24% 92%',
    'workspace-sidebar', '222 33% 10%',
    'workspace-sidebar-foreground', '210 18% 86%'
  )
),
(
  'cutie',
  'Cutie',
  'Paleta rosa e roxa com identidade suave.',
  true,
  NULL,
  ARRAY['#fff1f7', '#f062a8', '#9c6bff'],
  jsonb_build_object(
    'background', '322 58% 97%',
    'foreground', '292 20% 20%',
    'card', '0 0% 100%',
    'card-foreground', '292 20% 20%',
    'primary', '329 74% 62%',
    'primary-foreground', '0 0% 100%',
    'secondary', '319 40% 93%',
    'secondary-foreground', '294 18% 26%',
    'muted', '311 30% 94%',
    'muted-foreground', '295 10% 48%',
    'accent', '272 78% 66%',
    'accent-foreground', '0 0% 100%',
    'border', '310 20% 87%',
    'input', '310 20% 87%',
    'ring', '329 74% 62%',
    'sidebar-background', '287 30% 17%',
    'sidebar-foreground', '318 28% 90%',
    'sidebar-accent', '292 22% 24%',
    'sidebar-accent-foreground', '0 0% 100%',
    'sidebar-border', '290 18% 30%',
    'workspace-bg-a', '318 65% 95%',
    'workspace-bg-b', '274 45% 91%',
    'workspace-panel', '0 0% 100%',
    'workspace-panel-foreground', '292 20% 20%',
    'workspace-sidebar', '287 30% 17%',
    'workspace-sidebar-foreground', '318 28% 90%'
  ),
  jsonb_build_object(
    'background', '284 24% 11%',
    'foreground', '319 30% 92%',
    'card', '286 20% 13%',
    'card-foreground', '319 30% 92%',
    'primary', '327 82% 68%',
    'primary-foreground', '286 22% 12%',
    'secondary', '286 16% 18%',
    'secondary-foreground', '315 20% 88%',
    'muted', '286 14% 18%',
    'muted-foreground', '295 10% 66%',
    'accent', '269 80% 72%',
    'accent-foreground', '286 22% 12%',
    'border', '286 12% 23%',
    'input', '286 12% 23%',
    'ring', '327 82% 68%',
    'sidebar-background', '284 27% 9%',
    'sidebar-foreground', '317 26% 88%',
    'sidebar-accent', '286 18% 15%',
    'sidebar-accent-foreground', '316 28% 92%',
    'sidebar-border', '286 12% 20%',
    'workspace-bg-a', '288 18% 13%',
    'workspace-bg-b', '277 16% 10%',
    'workspace-panel', '286 20% 13%',
    'workspace-panel-foreground', '319 30% 92%',
    'workspace-sidebar', '284 27% 9%',
    'workspace-sidebar-foreground', '317 26% 88%'
  )
),
(
  'minimalista',
  'Minimalista',
  'Escala neutra com foco em simplicidade.',
  true,
  NULL,
  ARRAY['#f5f5f5', '#9a9a9a', '#1c1c1c'],
  jsonb_build_object(
    'background', '0 0% 97%',
    'foreground', '0 0% 12%',
    'card', '0 0% 100%',
    'card-foreground', '0 0% 12%',
    'primary', '0 0% 18%',
    'primary-foreground', '0 0% 100%',
    'secondary', '0 0% 93%',
    'secondary-foreground', '0 0% 20%',
    'muted', '0 0% 94%',
    'muted-foreground', '0 0% 42%',
    'accent', '0 0% 35%',
    'accent-foreground', '0 0% 100%',
    'border', '0 0% 86%',
    'input', '0 0% 86%',
    'ring', '0 0% 18%',
    'sidebar-background', '0 0% 12%',
    'sidebar-foreground', '0 0% 88%',
    'sidebar-accent', '0 0% 20%',
    'sidebar-accent-foreground', '0 0% 98%',
    'sidebar-border', '0 0% 24%',
    'workspace-bg-a', '0 0% 95%',
    'workspace-bg-b', '0 0% 90%',
    'workspace-panel', '0 0% 100%',
    'workspace-panel-foreground', '0 0% 12%',
    'workspace-sidebar', '0 0% 12%',
    'workspace-sidebar-foreground', '0 0% 88%'
  ),
  jsonb_build_object(
    'background', '0 0% 8%',
    'foreground', '0 0% 92%',
    'card', '0 0% 10%',
    'card-foreground', '0 0% 92%',
    'primary', '0 0% 90%',
    'primary-foreground', '0 0% 10%',
    'secondary', '0 0% 16%',
    'secondary-foreground', '0 0% 88%',
    'muted', '0 0% 15%',
    'muted-foreground', '0 0% 64%',
    'accent', '0 0% 74%',
    'accent-foreground', '0 0% 12%',
    'border', '0 0% 22%',
    'input', '0 0% 22%',
    'ring', '0 0% 82%',
    'sidebar-background', '0 0% 6%',
    'sidebar-foreground', '0 0% 84%',
    'sidebar-accent', '0 0% 14%',
    'sidebar-accent-foreground', '0 0% 92%',
    'sidebar-border', '0 0% 18%',
    'workspace-bg-a', '0 0% 12%',
    'workspace-bg-b', '0 0% 9%',
    'workspace-panel', '0 0% 10%',
    'workspace-panel-foreground', '0 0% 92%',
    'workspace-sidebar', '0 0% 6%',
    'workspace-sidebar-foreground', '0 0% 84%'
  )
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system,
  owner_user_id = EXCLUDED.owner_user_id,
  preview_colors = EXCLUDED.preview_colors,
  light_tokens = EXCLUDED.light_tokens,
  dark_tokens = EXCLUDED.dark_tokens,
  updated_at = now();

DO $$
BEGIN
  IF to_regclass('public.user_theme_preferences') IS NOT NULL THEN
    ALTER TABLE public.user_theme_preferences
      DROP CONSTRAINT IF EXISTS user_theme_preferences_template_key_check;

    ALTER TABLE public.user_theme_preferences
      DROP CONSTRAINT IF EXISTS user_theme_preferences_template_key_fkey;

    ALTER TABLE public.user_theme_preferences
      ADD CONSTRAINT user_theme_preferences_template_key_fkey
      FOREIGN KEY (template_key)
      REFERENCES public.theme_templates(key)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;
