
-- Weekly templates
CREATE TABLE public.weekly_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Meu Template',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own templates" ON public.weekly_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own templates" ON public.weekly_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON public.weekly_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON public.weekly_templates FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_weekly_templates_updated_at
  BEFORE UPDATE ON public.weekly_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Template items (subjects per day of week)
CREATE TABLE public.weekly_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.weekly_templates(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  optional boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own template items" ON public.weekly_template_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.weekly_templates t WHERE t.id = template_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can insert own template items" ON public.weekly_template_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.weekly_templates t WHERE t.id = template_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can update own template items" ON public.weekly_template_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.weekly_templates t WHERE t.id = template_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can delete own template items" ON public.weekly_template_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.weekly_templates t WHERE t.id = template_id AND t.user_id = auth.uid()));

-- Template day notes/observations
CREATE TABLE public.weekly_template_day_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.weekly_templates(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  content text NOT NULL DEFAULT '',
  UNIQUE(template_id, day_of_week)
);

ALTER TABLE public.weekly_template_day_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own template day notes" ON public.weekly_template_day_notes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.weekly_templates t WHERE t.id = template_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can insert own template day notes" ON public.weekly_template_day_notes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.weekly_templates t WHERE t.id = template_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can update own template day notes" ON public.weekly_template_day_notes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.weekly_templates t WHERE t.id = template_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can delete own template day notes" ON public.weekly_template_day_notes FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.weekly_templates t WHERE t.id = template_id AND t.user_id = auth.uid()));

-- Add template tracking to schedule_entries
ALTER TABLE public.schedule_entries ADD COLUMN template_id uuid REFERENCES public.weekly_templates(id) ON DELETE SET NULL;
ALTER TABLE public.schedule_entries ADD COLUMN is_override boolean NOT NULL DEFAULT false;
ALTER TABLE public.schedule_entries ADD COLUMN day_note text;

-- Validation triggers for day_of_week (0=Monday, 6=Sunday)
CREATE OR REPLACE FUNCTION public.validate_day_of_week()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.day_of_week < 0 OR NEW.day_of_week > 6 THEN
    RAISE EXCEPTION 'day_of_week must be between 0 and 6';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_template_items_dow
  BEFORE INSERT OR UPDATE ON public.weekly_template_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_day_of_week();

CREATE TRIGGER validate_day_notes_dow
  BEFORE INSERT OR UPDATE ON public.weekly_template_day_notes
  FOR EACH ROW EXECUTE FUNCTION public.validate_day_of_week();
