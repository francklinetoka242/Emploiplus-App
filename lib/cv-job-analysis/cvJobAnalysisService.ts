import { getCurrentCandidateProfile } from '../candidate-profile';
import { supabase } from '../supabase';
import { getCachedCvJobAnalysis, saveCvJobAnalysisCache } from './cvJobAnalysisCache';
import { type CvJobAnalysisRequest, type CvJobAnalysisResult, PROMPT_VERSION } from './cvJobAnalysisTypes';

function getAnalysisEndpoint(): string {
  if (process.env.EXPO_PUBLIC_CV_JOB_ANALYSIS_URL) {
    return process.env.EXPO_PUBLIC_CV_JOB_ANALYSIS_URL;
  }

  if (process.env.EXPO_PUBLIC_API_URL) {
    return `${process.env.EXPO_PUBLIC_API_URL}/api/cv-job-analysis`;
  }

  return 'http://localhost:3000/api/cv-job-analysis';
}

function toUserErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('cv') && normalized.includes('analy')) {
    return "Le candidat n'a pas encore de CV analysable pour cette offre.";
  }

  if (normalized.includes('offer') || normalized.includes('job') || normalized.includes('introuv')) {
    return "L'offre sélectionnée est introuvable.";
  }

  if (normalized.includes('429') || normalized.includes('sollicité') || normalized.includes('rate limit')) {
    return 'L\'analyseur est actuellement très sollicité.\nVeuillez réessayer dans quelques secondes.';
  }

  if (normalized.includes('groq') || normalized.includes('timeout') || normalized.includes('service')) {
    return 'Le service Groq rencontre des problèmes.\nVeuillez réessayer ultérieurement.';
  }

  return 'Une erreur est survenue pendant l\'analyse.';
}

export async function analyzeCvAgainstJob(request: CvJobAnalysisRequest): Promise<CvJobAnalysisResult> {
  const { candidate, error: candidateError } = await getCurrentCandidateProfile();
  if (candidateError || !candidate) {
    throw new Error('SESSION_EXPIRED');
  }

  if (candidate.id !== request.candidateId) {
    throw new Error('CANDIDATE_MISMATCH');
  }

  const candidateRecord = await supabase
    .from('candidates')
    .select('id, cv_text')
    .eq('id', request.candidateId)
    .maybeSingle();

  if (candidateRecord.error) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  const cvText = (candidateRecord.data?.cv_text ?? '').trim();
  if (!cvText) {
    throw new Error("Le candidat n'a pas encore de CV analysable pour cette offre.");
  }

  const jobRecord = await supabase
    .from('job_offers')
    .select('id, title, company, description, requirements')
    .eq('id', request.jobId)
    .maybeSingle();

  if (jobRecord.error || !jobRecord.data) {
    throw new Error("L'offre sélectionnée est introuvable.");
  }

  const cached = await getCachedCvJobAnalysis(request.candidateId, request.jobId);
  if (cached.data && cached.data.match_score !== undefined) {
    return {
      match_score: Number(cached.data.match_score ?? 0),
      score: Number(cached.data.match_score ?? 0),
      strengths: Array.isArray(cached.data.strengths) ? cached.data.strengths : [],
      improvements: Array.isArray(cached.data.improvements) ? cached.data.improvements : [],
      gaps: [],
      summary: '',
      cover_letter_draft: String(cached.data.cover_letter_draft ?? ''),
    } satisfies CvJobAnalysisResult;
  }

  try {
    const functionResult = await supabase.functions.invoke('cv-job-analysis', {
      body: {
        candidateId: request.candidateId,
        jobId: request.jobId,
        promptVersion: PROMPT_VERSION,
      },
    });

    if (functionResult.error) {
      throw functionResult.error;
    }

    const payload = functionResult.data as any;
    const analysis = payload?.analysis ?? payload;

    if (!analysis || typeof analysis !== 'object') {
      throw new Error('Une erreur est survenue pendant l\'analyse.');
    }

    const result = {
      match_score: Math.max(0, Math.min(100, Number(analysis.match_score ?? analysis.score ?? 0))),
      score: Math.max(0, Math.min(100, Number(analysis.score ?? analysis.match_score ?? 0))),
      experienceVerified: analysis.experienceVerified ?? analysis.experience_verified ?? '',
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths.slice(0, 5) : [],
      improvements: Array.isArray(analysis.improvements) ? analysis.improvements.slice(0, 5) : [],
      gaps: Array.isArray(analysis.gaps) ? analysis.gaps.slice(0, 5) : [],
      summary: analysis.summary ?? '',
      cover_letter_draft: analysis.cover_letter_draft ?? '',
    } satisfies CvJobAnalysisResult;

    await saveCvJobAnalysisCache({
      candidateId: request.candidateId,
      jobId: request.jobId,
      matchScore: result.match_score,
      strengths: result.strengths,
      improvements: result.improvements,
      gaps: result.gaps,
      coverLetterDraft: result.cover_letter_draft,
    });

    return result;
  } catch (functionError: any) {
    const endpoint = getAnalysisEndpoint();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${candidate.id}`,
        },
        body: JSON.stringify({
          candidateId: request.candidateId,
          jobId: request.jobId,
          promptVersion: PROMPT_VERSION,
        }),
      });

      if (response.status === 429) {
        throw new Error('429');
      }

      if (response.status >= 500 && response.status < 600) {
        throw new Error('500');
      }

      if (!response.ok) {
        throw new Error('Une erreur est survenue pendant l\'analyse.');
      }

      const payload = await response.json();
      const analysis = payload?.analysis ?? payload;
      const result = {
        match_score: Math.max(0, Math.min(100, Number(analysis.match_score ?? analysis.score ?? 0))),
        score: Math.max(0, Math.min(100, Number(analysis.score ?? analysis.match_score ?? 0))),
        experienceVerified: analysis.experienceVerified ?? analysis.experience_verified ?? '',
        strengths: Array.isArray(analysis.strengths) ? analysis.strengths.slice(0, 5) : [],
        improvements: Array.isArray(analysis.improvements) ? analysis.improvements.slice(0, 5) : [],
        gaps: Array.isArray(analysis.gaps) ? analysis.gaps.slice(0, 5) : [],
        summary: analysis.summary ?? '',
        cover_letter_draft: analysis.cover_letter_draft ?? '',
      } satisfies CvJobAnalysisResult;

      await saveCvJobAnalysisCache({
        candidateId: request.candidateId,
        jobId: request.jobId,
        matchScore: result.match_score,
        strengths: result.strengths,
        improvements: result.improvements,
        gaps: result.gaps,
        coverLetterDraft: result.cover_letter_draft,
      });

      return result;
    } catch (fallbackError: any) {
      const message = String(fallbackError?.message ?? 'Une erreur est survenue pendant l\'analyse.');
      const errorMessage = toUserErrorMessage(message);
      throw new Error(errorMessage);
    }
  }
}

export { PROMPT_VERSION };
