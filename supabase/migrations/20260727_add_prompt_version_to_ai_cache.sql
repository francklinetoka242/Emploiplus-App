-- Migration: 20260727_add_prompt_version_to_ai_cache.sql
-- Purpose: Add prompt versioning support to ai_analysis_cache table
-- This allows invalidation of cached analyses when the prompt or RH logic changes

-- Add prompt_version column to track which version of the prompt generated each cached result
ALTER TABLE IF EXISTS public.ai_analysis_cache
ADD COLUMN IF NOT EXISTS prompt_version VARCHAR(50) NOT NULL DEFAULT 'v1.0';

-- Create an index on prompt_version for efficient queries
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_prompt_version
  ON public.ai_analysis_cache(prompt_version);

-- Add a comment explaining the purpose of this column
COMMENT ON COLUMN public.ai_analysis_cache.prompt_version IS
  'Version of the Groq prompt system used to generate this analysis. When PROMPT_VERSION in the application changes, cached entries with mismatched versions are automatically invalidated (see groqAnalysisService.ts for logic).';

-- Purge obsolete cache entries (all pre-migration entries will have default 'v1.0' which won't match current prompt)
-- This ensures fresh analysis for all candidates on first analysis after migration
TRUNCATE TABLE public.ai_analysis_cache CASCADE;

-- Reload PostgREST schema cache immediately to make the new column visible to the API
NOTIFY pgrst, 'reload schema';
