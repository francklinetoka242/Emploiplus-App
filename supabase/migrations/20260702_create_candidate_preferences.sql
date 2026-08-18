-- Create candidate preferences table
CREATE TABLE public.candidate_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL UNIQUE REFERENCES public.candidates(id) ON DELETE CASCADE,
  contract_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  work_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  salary_min INTEGER DEFAULT 0,
  salary_max INTEGER DEFAULT 0,
  seniority_level TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidate_preferences_candidate_id ON public.candidate_preferences(candidate_id);
ALTER TABLE public.candidate_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_preferences TO authenticated;
GRANT ALL ON public.candidate_preferences TO service_role;

CREATE POLICY "Users see their own preferences" ON public.candidate_preferences FOR SELECT TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));
CREATE POLICY "Users manage own preferences" ON public.candidate_preferences FOR ALL TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()))
  WITH CHECK (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

CREATE TRIGGER set_candidate_preferences_updated_at BEFORE UPDATE ON public.candidate_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
