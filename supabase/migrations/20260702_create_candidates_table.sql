-- Create candidate_status enum
CREATE TYPE public.candidate_status AS ENUM ('active', 'inactive', 'archived');

-- Create candidates table
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  headline TEXT,
  location_city TEXT,
  location_country TEXT,
  date_of_birth DATE,
  status candidate_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_candidates_user_id ON public.candidates(user_id);
CREATE INDEX idx_candidates_email ON public.candidates(email);
CREATE INDEX idx_candidates_status ON public.candidates(status);

-- Enable RLS
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;

-- Policies
CREATE POLICY "Users see their own candidate profile" ON public.candidates FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users insert own candidate profile" ON public.candidates FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own candidate profile" ON public.candidates FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Staff can see all candidates" ON public.candidates FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER set_candidates_updated_at BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Create candidate skills table
CREATE TABLE public.candidate_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  proficiency_level TEXT DEFAULT 'intermediate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidate_skills_candidate_id ON public.candidate_skills(candidate_id);
ALTER TABLE public.candidate_skills ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_skills TO authenticated;
GRANT ALL ON public.candidate_skills TO service_role;

CREATE POLICY "Users see their own skills" ON public.candidate_skills FOR SELECT TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));
CREATE POLICY "Users manage own skills" ON public.candidate_skills FOR ALL TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()))
  WITH CHECK (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

-- Create candidate experience table
CREATE TABLE public.candidate_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidate_experience_candidate_id ON public.candidate_experience(candidate_id);
ALTER TABLE public.candidate_experience ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_experience TO authenticated;
GRANT ALL ON public.candidate_experience TO service_role;

CREATE POLICY "Users see their own experience" ON public.candidate_experience FOR SELECT TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));
CREATE POLICY "Users manage own experience" ON public.candidate_experience FOR ALL TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()))
  WITH CHECK (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

CREATE TRIGGER set_candidate_experience_updated_at BEFORE UPDATE ON public.candidate_experience
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Create candidate education table
CREATE TABLE public.candidate_education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  school TEXT NOT NULL,
  degree TEXT NOT NULL,
  field_of_study TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidate_education_candidate_id ON public.candidate_education(candidate_id);
ALTER TABLE public.candidate_education ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_education TO authenticated;
GRANT ALL ON public.candidate_education TO service_role;

CREATE POLICY "Users see their own education" ON public.candidate_education FOR SELECT TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));
CREATE POLICY "Users manage own education" ON public.candidate_education FOR ALL TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()))
  WITH CHECK (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

CREATE TRIGGER set_candidate_education_updated_at BEFORE UPDATE ON public.candidate_education
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
