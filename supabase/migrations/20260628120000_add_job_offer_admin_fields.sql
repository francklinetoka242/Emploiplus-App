ALTER TABLE public.job_offers
  ADD COLUMN IF NOT EXISTS salary TEXT,
  ADD COLUMN IF NOT EXISTS auto_share BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.job_offers.salary IS 'Salaire renseigné dans le formulaire d''administration';
COMMENT ON COLUMN public.job_offers.auto_share IS 'Indique si l''offre doit être diffusée automatiquement';
COMMENT ON COLUMN public.job_offers.deadline IS 'Date limite de candidature pour l''offre';
COMMENT ON COLUMN public.job_offers.tags IS 'Mots-clés ou tags associés à l''offre';
