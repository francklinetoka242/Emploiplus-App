-- Migration: 20260727_update_match_job_offers_for_candidate_pagination.sql
-- Updates the candidate matching RPC to support pagination and exclude expired published offers.

CREATE OR REPLACE FUNCTION public.match_job_offers_for_candidate(
  candidate_id UUID,
  match_threshold FLOAT DEFAULT 0.0,
  match_count INT DEFAULT 10,
  match_offset INT DEFAULT 0
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
      AND job_offers.status = 'published'
      AND (
        job_offers.expires_at IS NULL
        OR job_offers.expires_at > NOW()
        OR (job_offers.expires_at IS NULL AND job_offers.deadline IS NULL)
      )
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
  LIMIT match_count
  OFFSET match_offset;
$$;
