import { MAX_ARRAY_ITEMS, type CvJobAnalysisResult } from './cvJobAnalysisTypes';

function stripInvisibleUnicode(value: string): string {
  return value.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\r/g, '');
}

export function sanitizeAnalysisText(raw: unknown): string {
  if (typeof raw !== 'string') {
    return '';
  }

  let text = stripInvisibleUnicode(raw).trim();

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    text = fenceMatch[1].trim();
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  return text.trim();
}

export function normalizeScore(value: unknown): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
}

export function normalizeString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || fallback;
}

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const cleaned = value
    .map((item) => normalizeString(item))
    .filter((item) => item.length > 0)
    .slice(0, MAX_ARRAY_ITEMS);

  return cleaned;
}

export function parseCvJobAnalysisResponse(raw: unknown): CvJobAnalysisResult {
  const text = sanitizeAnalysisText(raw);
  if (!text) {
    throw new Error('EMPTY_ANALYSIS_RESPONSE');
  }

  const parsed = JSON.parse(text) as Record<string, any>;

  const matchScore = normalizeScore(parsed.match_score ?? parsed.score ?? 0);

  const result: CvJobAnalysisResult = {
    match_score: matchScore,
    score: matchScore,
    experienceVerified: normalizeString(parsed.experienceVerified ?? parsed.experience_verified ?? ''),
    strengths: normalizeStringArray(parsed.strengths),
    improvements: normalizeStringArray(parsed.improvements),
    gaps: normalizeStringArray(parsed.gaps),
    summary: normalizeString(parsed.summary ?? ''),
    cover_letter_draft: normalizeString(parsed.cover_letter_draft ?? parsed.coverLetterDraft ?? ''),
  };

  if (!result.cover_letter_draft) {
    result.cover_letter_draft = 'Bonjour,\n\nJe suis particulièrement motivé(e) par cette opportunité et je souhaite mettre à profit mon profil pour contribuer à votre entreprise.\n\nCordialement,';
  }

  return result;
}

export { MAX_ARRAY_ITEMS };
