-- Theme template and mode per user
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.user_theme_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  template_key text NOT NULL DEFAULT 'padrao',
  mode text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_theme_preferences_template_key_check CHECK (template_key IN ('padrao', 'cutie', 'minimalista')),
  CONSTRAINT user_theme_preferences_mode_check CHECK (mode IN ('light', 'dark', 'system'))
);

ALTER TABLE public.user_theme_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own theme preferences" ON public.user_theme_preferences;
DROP POLICY IF EXISTS user_theme_preferences_select_own ON public.user_theme_preferences;
CREATE POLICY user_theme_preferences_select_own ON public.user_theme_preferences
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own theme preferences" ON public.user_theme_preferences;
DROP POLICY IF EXISTS user_theme_preferences_insert_own ON public.user_theme_preferences;
CREATE POLICY user_theme_preferences_insert_own ON public.user_theme_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own theme preferences" ON public.user_theme_preferences;
DROP POLICY IF EXISTS user_theme_preferences_update_own ON public.user_theme_preferences;
CREATE POLICY user_theme_preferences_update_own ON public.user_theme_preferences
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own theme preferences" ON public.user_theme_preferences;
DROP POLICY IF EXISTS user_theme_preferences_delete_own ON public.user_theme_preferences;
CREATE POLICY user_theme_preferences_delete_own ON public.user_theme_preferences
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_theme_preferences_updated_at ON public.user_theme_preferences;
CREATE TRIGGER update_user_theme_preferences_updated_at
  BEFORE UPDATE ON public.user_theme_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
