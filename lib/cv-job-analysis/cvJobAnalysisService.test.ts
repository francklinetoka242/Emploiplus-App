import test from 'node:test';
import assert from 'node:assert/strict';

import {
  sanitizeAnalysisText,
  parseCvJobAnalysisResponse,
  normalizeScore,
  MAX_ARRAY_ITEMS,
} from './cvJobAnalysisSanitizer';

const sampleResponse = '{"match_score":87,"experienceVerified":"3 ans en gestion de projets","strengths":["Gestion de projet","Communication","Travail en équipe"],"improvements":["Mieux documenter les résultats","Renforcer la gestion de budget"],"gaps":["Pas de certification spécifique"],"summary":"Candidat solide pour le poste.","cover_letter_draft":"Bonjour, ..."}';

test('sanitizeAnalysisText removes markdown and invisible characters', () => {
  const raw = '\u200b```json\n{ "match_score": 91 }\n```\u200b';
  const sanitized = sanitizeAnalysisText(raw);
  assert.equal(sanitized.includes('```'), false);
  assert.equal(sanitized.includes('\u200b'), false);
  assert.match(sanitized, /\{.*match_score.*91.*\}/s);
});

test('parseCvJobAnalysisResponse validates and normalizes data', () => {
  const parsed = parseCvJobAnalysisResponse(sampleResponse);
  assert.equal(parsed.match_score, 87);
  assert.equal(parsed.strengths.length, 3);
  assert.deepEqual(parsed.improvements.slice(0, 2).length, 2);
  assert.ok(parsed.cover_letter_draft.length > 0);
});

test('normalizeScore clamps values to 0-100', () => {
  assert.equal(normalizeScore(120), 100);
  assert.equal(normalizeScore(-10), 0);
  assert.equal(normalizeScore(42), 42);
});

test('array sanitizer keeps at most five entries', () => {
  const values = Array.from({ length: 12 }, (_, index) => `Item ${index + 1}`);
  const result = values.slice(0, MAX_ARRAY_ITEMS);
  assert.equal(result.length, MAX_ARRAY_ITEMS);
});
