-- Create candidate_saved_offers table to track job offers saved by candidates
CREATE TABLE public.candidate_saved_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_offer_id UUID NOT NULL REFERENCES public.job_offers(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, job_offer_id)
);

CREATE INDEX idx_candidate_saved_offers_candidate_id ON public.candidate_saved_offers(candidate_id);
CREATE INDEX idx_candidate_saved_offers_job_offer_id ON public.candidate_saved_offers(job_offer_id);
CREATE INDEX idx_candidate_saved_offers_saved_at ON public.candidate_saved_offers(saved_at DESC);

ALTER TABLE public.candidate_saved_offers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_saved_offers TO authenticated;
GRANT ALL ON public.candidate_saved_offers TO service_role;

-- RLS Policies
CREATE POLICY "Candidates see their own saved offers" ON public.candidate_saved_offers FOR SELECT TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

CREATE POLICY "Candidates save offers" ON public.candidate_saved_offers FOR INSERT TO authenticated
  WITH CHECK (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

CREATE POLICY "Candidates delete saved offers" ON public.candidate_saved_offers FOR DELETE TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

-- Staff can view all saved offers
CREATE POLICY "Staff view all saved offers" ON public.candidate_saved_offers FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
