-- Migration: 20260727_add_cv_url_to_candidates.sql
-- Purpose: Persist candidate CV storage URL so the client can restore uploaded CVs after logout/login

ALTER TABLE IF EXISTS public.candidates
ADD COLUMN IF NOT EXISTS cv_url TEXT;

COMMENT ON COLUMN public.candidates.cv_url IS 'Public or signed URL to the candidate CV file stored in Supabase Storage.';

-- Optional index if queries will filter by cv_url
CREATE INDEX IF NOT EXISTS idx_candidates_cv_url ON public.candidates ((cv_url IS NOT NULL));

-- Reload PostgREST schema cache to pick up the new column
NOTIFY pgrst, 'reload schema';
