import { supabase } from '../supabase';
import { getCurrentCandidateProfile } from '../candidate-profile';
import { PROMPT_VERSION, type CvJobAnalysisCacheRow } from './cvJobAnalysisTypes';

export async function getCachedCvJobAnalysis(candidateId: string, jobId: string) {
  const { data, error } = await supabase
    .from('ai_analysis_cache')
    .select('*')
    .eq('candidate_id', candidateId)
    .eq('job_id', jobId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: null };
  }

  const row = data as CvJobAnalysisCacheRow;
  if ((row.prompt_version ?? '') !== PROMPT_VERSION) {
    return { data: null, error: null };
  }

  return {
    data: {
      match_score: Number(row.match_score ?? 0),
      strengths: Array.isArray(row.strengths) ? row.strengths : [],
      improvements: Array.isArray(row.improvements) ? row.improvements : [],
      cover_letter_draft: row.cover_letter_draft ?? '',
      prompt_version: row.prompt_version ?? PROMPT_VERSION,
    },
    error: null,
  };
}

export async function saveCvJobAnalysisCache(params: {
  candidateId: string;
  jobId: string;
  matchScore: number;
  strengths: string[];
  improvements: string[];
  gaps: string[];
  coverLetterDraft: string;
}) {
  const { candidate, error } = await getCurrentCandidateProfile();
  if (error || !candidate) {
    return { error: error ?? new Error('PROFILE_NOT_FOUND') };
  }

  const payload = {
    candidate_id: params.candidateId,
    job_id: params.jobId,
    match_score: Math.max(0, Math.min(100, Number(params.matchScore) || 0)),
    strengths: params.strengths.slice(0, 5),
    improvements: params.improvements.slice(0, 5),
    cover_letter_draft: params.coverLetterDraft,
    prompt_version: PROMPT_VERSION,
  };

  const { data, error: upsertError } = await supabase
    .from('ai_analysis_cache')
    .upsert(payload, { onConflict: 'candidate_id,job_id' })
    .select('*')
    .maybeSingle();

  return {
    data: data ?? null,
    error: upsertError,
  };
}
