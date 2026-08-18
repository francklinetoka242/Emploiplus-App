import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const PROMPT_VERSION = 'v2.2_2026-07-27';
const MODEL = 'llama-3.1-8b-instant';

function buildPrompt(candidateCvText: string, jobTitle: string, company: string, jobDescription: string, requirements: string) {
  return `
Tu es un évaluateur RH strict et précis. Ta tâche est d’analyser le CV d’un candidat par rapport à une offre d’emploi donnée.

RÈGLES ABSOLUES
1. Fidélité stricte au CV : n’ajoute jamais d’expérience, diplôme, certification, langages, outils, missions ou résultats qui ne figurent pas explicitement dans le CV.
2. Aucun ajout d’expérience non présente : si le CV ne mentionne pas une expérience, ne la suppose jamais.
3. Rupture métier totale : si le candidat est très éloigné du poste, le score ne doit pas dépasser 25%.
4. Métiers proches : un candidat proche du poste peut obtenir un score de 60 à 85% selon la complétude du profil.
5. Certification obligatoire absente : si une certification est exigée et absente, le score ne doit pas dépasser 45%.
6. Évaluation stricte des diplômes : n’attribue pas de diplôme ou niveau supérieur à celui réellement indiqué.
7. Lettre de motivation professionnelle : propose une lettre de motivation claire, courte, crédible et adaptée à l’offre.
8. Aucun discours d’auto-disqualification : ne dévalue pas le candidat sans fondement ; reste précis, professionnel, factuel.
9. Réponse JSON uniquement, sans texte de contexte, sans markdown, sans commentaires, sans explication hors JSON.

INFORMATION OFFRE
- Poste : ${jobTitle}
- Entreprise : ${company}
- Description : ${jobDescription}
- Exigences : ${requirements}

CV CANDIDAT
${candidateCvText}

FORMAT DE SORTIE EXACT
{
  "match_score": 0,
  "experienceVerified": "",
  "strengths": ["", ""],
  "improvements": ["", ""],
  "gaps": ["", ""],
  "summary": "",
  "cover_letter_draft": ""
}

RÉSOLUTION
- match_score : note de 0 à 100, arrondie à l’entier le plus proche.
- experienceVerified : une phrase brève, factuelle, basée uniquement sur les expériences et compétences citées dans le CV.
- strengths : maximum 5 éléments, uniquement des forces réellement observables dans le CV et pertinentes pour l’offre.
- improvements : maximum 5 éléments, uniquement des points de progression crédibles et réalistes.
- gaps : maximum 5 éléments, uniquement les écarts réels entre le CV et les exigences du poste.
- summary : résumé personnalisé, professionnel, de 2 à 4 phrases max.
- cover_letter_draft : lettre de motivation courte, professionnelle, écrite en français, adaptée à l’offre et au profil, sans inventer de faits.

IMPORTANT
- Ne pas mentionner des compétences ou niveaux non présents dans le CV.
- Si le candidat n’a pas les qualifications suffisantes, dis-le clairement avec un score bas, sans jugement inutile.
- Réponds uniquement avec un objet JSON valide, sans balise code, sans markdown.
`;
}

function sanitizeJsonText(raw: string): string {
  let text = raw.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\r/g, '');
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence && fence[1]) {
    text = fence[1].trim();
  }

  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    text = text.slice(first, last + 1);
  }

  return text.trim();
}

function normalizeScore(value: unknown): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.replace(/\s+/g, ' ').trim() : ''))
    .filter((item) => item.length > 0)
    .slice(0, 5);
}

function normalizeAnalysis(parsed: any) {
  const matchScore = normalizeScore(parsed.match_score ?? parsed.score ?? 0);
  return {
    match_score: matchScore,
    score: matchScore,
    experienceVerified: typeof parsed.experienceVerified === 'string' ? parsed.experienceVerified.trim() : '',
    strengths: normalizeArray(parsed.strengths),
    improvements: normalizeArray(parsed.improvements),
    gaps: normalizeArray(parsed.gaps),
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    cover_letter_draft: typeof parsed.cover_letter_draft === 'string' && parsed.cover_letter_draft.trim()
      ? parsed.cover_letter_draft.trim()
      : 'Bonjour,\n\nJe suis très motivé(e) par cette opportunité et je souhaite mettre à profit mon profil au service de votre entreprise.\n\nCordialement,',
  };
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const groqKey = Deno.env.get('GROQ_API_KEY');

    if (!supabaseUrl || !supabaseKey || !groqKey) {
      return new Response(JSON.stringify({ error: 'Missing server configuration.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const origin = req.headers.get('origin') ?? '';
    const allowedOrigin = (origin && (origin.includes('emploiplus-group.com') || origin.includes('localhost'))) ? origin : '*';

    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
      });
    }

    const body = await req.json();
    const candidateId = String(body.candidateId ?? '');
    const jobId = String(body.jobId ?? '');
    const promptVersion = String(body.promptVersion ?? PROMPT_VERSION);

    if (!candidateId || !jobId) {
      return new Response(JSON.stringify({ error: 'Invalid payload.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id, cv_text')
      .eq('id', candidateId)
      .maybeSingle();

    if (candidateError || !candidate) {
      return new Response(JSON.stringify({ error: 'PROFILE_NOT_FOUND' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
      });
    }

    const cvText = String(candidate.cv_text ?? '').trim();
    if (!cvText) {
      return new Response(JSON.stringify({
        error: "Le candidat n'a pas encore de CV analysable pour cette offre.",
      }), {
        status: 422,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
      });
    }

    const { data: job, error: jobError } = await supabase
      .from('job_offers')
      .select('id, title, company, description, requirements')
      .eq('id', jobId)
      .maybeSingle();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "L'offre sélectionnée est introuvable." }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
      });
    }

    const { data: cacheRow, error: cacheError } = await supabase
      .from('ai_analysis_cache')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('job_id', jobId)
      .maybeSingle();

    if (!cacheError && cacheRow && String(cacheRow.prompt_version ?? '') === promptVersion) {
      return new Response(JSON.stringify({ analysis: {
        match_score: Number(cacheRow.match_score ?? 0),
        score: Number(cacheRow.match_score ?? 0),
        strengths: Array.isArray(cacheRow.strengths) ? cacheRow.strengths.slice(0, 5) : [],
        improvements: Array.isArray(cacheRow.improvements) ? cacheRow.improvements.slice(0, 5) : [],
        gaps: [],
        summary: '',
        cover_letter_draft: String(cacheRow.cover_letter_draft ?? ''),
      }}), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin,
        },
      });
    }

    const prompt = buildPrompt(cvText, job.title ?? '', job.company ?? '', job.description ?? '', job.requirements ?? '');

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Tu réponds en JSON strict selon la consigne donnée.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (groqResponse.status === 429) {
      return new Response(JSON.stringify({ error: 'L\'analyseur est actuellement très sollicité.\nVeuillez réessayer dans quelques secondes.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
      });
    }

    if (groqResponse.status >= 500 && groqResponse.status < 600) {
      return new Response(JSON.stringify({ error: 'Le service Groq rencontre des problèmes.\nVeuillez réessayer ultérieurement.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
      });
    }

    if (!groqResponse.ok) {
      return new Response(JSON.stringify({ error: 'Une erreur est survenue pendant l\'analyse.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
      });
    }

    const groqPayload = await groqResponse.json();
    const content = String(groqPayload?.choices?.[0]?.message?.content ?? '{}');
    const jsonText = sanitizeJsonText(content);
    const parsed = JSON.parse(jsonText);
    const analysis = normalizeAnalysis(parsed);

    const { error: upsertError } = await supabase.from('ai_analysis_cache').upsert({
      candidate_id: candidateId,
      job_id: jobId,
      match_score: analysis.match_score,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      cover_letter_draft: analysis.cover_letter_draft,
      prompt_version: promptVersion,
    }, { onConflict: 'candidate_id,job_id' });

    if (upsertError) {
      console.warn('Cache insert failed', upsertError.message);
    }

    return new Response(JSON.stringify({ analysis }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Une erreur est survenue pendant l\'analyse.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
