-- Create candidate_languages table
CREATE TABLE public.candidate_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  language_name TEXT NOT NULL,
  proficiency_level TEXT NOT NULL CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'fluent', 'native')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, language_name)
);

CREATE INDEX idx_candidate_languages_candidate_id ON public.candidate_languages(candidate_id);
ALTER TABLE public.candidate_languages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_languages TO authenticated;
GRANT ALL ON public.candidate_languages TO service_role;

-- RLS Policies
CREATE POLICY "Candidates see their own languages" ON public.candidate_languages FOR SELECT TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

CREATE POLICY "Candidates create languages" ON public.candidate_languages FOR INSERT TO authenticated
  WITH CHECK (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

CREATE POLICY "Candidates update their own languages" ON public.candidate_languages FOR UPDATE TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()))
  WITH CHECK (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

CREATE POLICY "Candidates delete their own languages" ON public.candidate_languages FOR DELETE TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

-- Staff can manage all languages
CREATE POLICY "Staff view all languages" ON public.candidate_languages FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff manage languages" ON public.candidate_languages FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER set_candidate_languages_updated_at BEFORE UPDATE ON public.candidate_languages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
