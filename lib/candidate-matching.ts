import { getCurrentCandidateProfile } from './candidate-profile';
import { supabase } from './supabase';

export type CandidateJobMatch = {
  id: string;
  title: string | null;
  company: string | null;
  location_city: string | null;
  contract_type: string | null;
  salary: string | number | null;
  description: string | null;
  status: string | null;
  score: number | null;
  publish_at: string | null;
  cover_image_url?: string | null;
};

export async function fetchMatchingJobsForCandidate(options?: { threshold?: number; limit?: number; offset?: number }) {
  const { candidate, error } = await getCurrentCandidateProfile();

  if (error || !candidate) {
    return { data: [], error: error ?? new Error('PROFILE_NOT_FOUND') };
  }

  const threshold = options?.threshold ?? 0;
  const limit = options?.limit ?? 5;
  const offset = options?.offset ?? 0;

  const { data, error: rpcError } = await supabase.rpc('match_job_offers_for_candidate', {
    candidate_id: candidate.id,
    match_threshold: threshold,
    match_count: limit,
    match_offset: offset,
  });

  return {
    data: (data ?? []) as CandidateJobMatch[],
    error: rpcError,
  };
}

export async function fetchCandidateDashboardRecommendations() {
  const { candidate, error } = await getCurrentCandidateProfile();

  if (error || !candidate) {
    return { data: [], error: error ?? new Error('PROFILE_NOT_FOUND') };
  }

  let data: any[] | null = [];
  let matchError: any = null;

  try {
    const result = await supabase.rpc('match_job_offers_for_candidate', {
      candidate_id: candidate.id,
      match_threshold: 0,
      match_count: 3,
      match_offset: 0,
    });
    data = result.data ?? [];
    matchError = result.error ?? null;
  } catch (fetchError: any) {
    data = [];
    matchError = fetchError;
  }

  return {
    data: (data ?? []) as CandidateJobMatch[],
    error: matchError,
  };
}

export async function fetchAiAnalysisCacheForJob(jobId: string) {
  const { candidate, error } = await getCurrentCandidateProfile();

  if (error || !candidate) {
    return { data: null, error: error ?? new Error('PROFILE_NOT_FOUND') };
  }

  const { data, error: cacheError } = await supabase
    .from('ai_analysis_cache')
    .select('*')
    .eq('candidate_id', candidate.id)
    .eq('job_id', jobId)
    .maybeSingle();

  return {
    data: data ?? null,
    error: cacheError,
  };
}
