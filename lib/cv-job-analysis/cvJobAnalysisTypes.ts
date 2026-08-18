export interface CvJobAnalysisResult {
  match_score: number;
  score?: number;
  experienceVerified?: string;
  strengths: string[];
  improvements: string[];
  gaps: string[];
  summary?: string;
  cover_letter_draft: string;
}

export interface CvJobAnalysisCacheRow {
  id?: string;
  candidate_id: string;
  job_id: string;
  match_score: number;
  strengths: string[];
  improvements: string[];
  cover_letter_draft: string;
  prompt_version: string;
  created_at?: string;
}

export interface CvJobAnalysisRequest {
  candidateId: string;
  jobId: string;
}

export interface CvJobAnalysisError {
  code: 'CV_MISSING' | 'JOB_NOT_FOUND' | 'RATE_LIMITED' | 'GROQ_ERROR' | 'GENERAL_ERROR';
  message: string;
}

export const PROMPT_VERSION = 'v2.2_2026-07-27';
export const MAX_ARRAY_ITEMS = 5;
