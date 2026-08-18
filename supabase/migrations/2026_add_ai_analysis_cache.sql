-- Migration: 2026_add_ai_analysis_cache.sql
-- Creates a cache table for AI candidate/job analysis results

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.ai_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.job_offers(id) ON DELETE CASCADE,
  match_score INT NOT NULL,
  strengths TEXT[] NOT NULL DEFAULT '{}',
  improvements TEXT[] NOT NULL DEFAULT '{}',
  cover_letter_draft TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_analysis_cache_candidate_job_unique UNIQUE (candidate_id, job_id)
);

ALTER TABLE public.ai_analysis_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_analysis_cache'
      AND policyname = 'ai_analysis_cache_select_own'
  ) THEN
    CREATE POLICY ai_analysis_cache_select_own
      ON public.ai_analysis_cache
      FOR SELECT
      USING (
        candidate_id IN (
          SELECT id FROM public.candidates WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_analysis_cache'
      AND policyname = 'ai_analysis_cache_insert_own'
  ) THEN
    CREATE POLICY ai_analysis_cache_insert_own
      ON public.ai_analysis_cache
      FOR INSERT
      WITH CHECK (
        candidate_id IN (
          SELECT id FROM public.candidates WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;
