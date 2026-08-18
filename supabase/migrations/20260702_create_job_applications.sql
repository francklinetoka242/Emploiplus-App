-- Create job_applications table to track candidate applications to job offers
CREATE TYPE public.application_status AS ENUM ('submitted', 'reviewed', 'shortlisted', 'rejected', 'accepted', 'withdrawn');

CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_offer_id UUID NOT NULL REFERENCES public.job_offers(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'submitted',
  cover_letter TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, job_offer_id)
);

CREATE INDEX idx_job_applications_candidate_id ON public.job_applications(candidate_id);
CREATE INDEX idx_job_applications_job_offer_id ON public.job_applications(job_offer_id);
CREATE INDEX idx_job_applications_status ON public.job_applications(status);
CREATE INDEX idx_job_applications_applied_at ON public.job_applications(applied_at DESC);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;
GRANT ALL ON public.job_applications TO service_role;

-- RLS Policies
CREATE POLICY "Candidates see their own applications" ON public.job_applications FOR SELECT TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

CREATE POLICY "Candidates create applications" ON public.job_applications FOR INSERT TO authenticated
  WITH CHECK (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

CREATE POLICY "Candidates update their own applications" ON public.job_applications FOR UPDATE TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()))
  WITH CHECK (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

CREATE POLICY "Candidates delete their own applications" ON public.job_applications FOR DELETE TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

-- Staff can manage all applications
CREATE POLICY "Staff view all applications" ON public.job_applications FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff manage applications" ON public.job_applications FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER set_job_applications_updated_at BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
