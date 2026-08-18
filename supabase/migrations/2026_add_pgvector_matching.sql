-- Migration: 2026_add_pgvector_matching.sql
-- Adds pgvector extension, cv_text and embedding_vector columns and an RPC for matching

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add cv_text column to candidates
ALTER TABLE IF EXISTS public.candidates
ADD COLUMN IF NOT EXISTS cv_text TEXT;

-- Add embedding_vector to candidates and job_offers (768 dims)
ALTER TABLE IF EXISTS public.candidates
ADD COLUMN IF NOT EXISTS embedding_vector vector(768);

ALTER TABLE IF EXISTS public.job_offers
ADD COLUMN IF NOT EXISTS embedding_vector vector(768);

-- Create indexes for efficient nearest-neighbor search
-- Using ivfflat for job_offers and candidates. Requires REINDEXING/ANALYZE after populating.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_job_offers_embedding_vector_ivfflat'
  ) THEN
    -- ivfflat index on job_offers.embedding_vector
    EXECUTE 'CREATE INDEX idx_job_offers_embedding_vector_ivfflat ON public.job_offers USING ivfflat (embedding_vector vector_l2_ops) WITH (lists = 100);';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_candidates_embedding_vector_ivfflat'
  ) THEN
    EXECUTE 'CREATE INDEX idx_candidates_embedding_vector_ivfflat ON public.candidates USING ivfflat (embedding_vector vector_l2_ops) WITH (lists = 100);';
  END IF;
END$$;

-- Create RPC function to match job offers for a candidate using cosine similarity
-- Returns job_offers.* plus a score column (similarity in [0..1]) ordered desc
CREATE OR REPLACE FUNCTION public.match_job_offers_for_candidate(
  candidate_id UUID,
  match_threshold FLOAT DEFAULT 0.0,
  match_count INT DEFAULT 10
) RETURNS TABLE(
  id uuid,
  application_email text,
  application_whatsapp text,
  auto_share boolean,
  company text,
  company_logo text,
  contract_type public.contract_type,
  cover_image text,
  created_at timestamptz,
  deadline text,
  description text,
  expires_at text,
  external_link text,
  featured_until text,
  slug text,
  status public.job_status,
  tags text[],
  title text,
  updated_at timestamptz,
  views_count integer,
  salary text,
  publish_at timestamptz,
  og_image text,
  meta_title text,
  meta_description text,
  cover_image_url text,
  score float
) LANGUAGE sql STABLE AS $$
  WITH cand AS (
    SELECT embedding_vector FROM public.candidates WHERE id = candidate_id
  ),
  offers AS (
    SELECT *,
      1 - (cand.embedding_vector <=> job_offers.embedding_vector) AS similarity
    FROM public.job_offers, cand
    WHERE job_offers.embedding_vector IS NOT NULL
  )
  SELECT
    o.id,
    o.application_email,
    o.application_whatsapp,
    o.auto_share,
    o.company,
    o.company_logo,
    o.contract_type,
    o.cover_image,
    o.created_at,
    o.deadline,
    o.description,
    o.expires_at,
    o.external_link,
    o.featured_until,
    o.slug,
    o.status,
    o.tags,
    o.title,
    o.updated_at,
    o.views_count,
    o.salary,
    o.publish_at,
    o.og_image,
    o.meta_title,
    o.meta_description,
    o.cover_image as cover_image_url,
    o.similarity as score
  FROM offers o
  WHERE o.similarity >= match_threshold
  ORDER BY o.similarity DESC
  LIMIT match_count;
$$;

-- Force an updated_at refresh for published job offers after adding the embedding vector support.
-- This can help downstream processes detect existing rows and reindex if needed.
UPDATE public.job_offers
SET updated_at = NOW()
WHERE status = 'published';



