import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildDocumentStoragePath,
    getCandidateDocumentsStorageKey,
    normalizeCandidateDocumentType,
    validateCandidateDocumentFile,
} from './candidate-documents.ts';

test('validateCandidateDocumentFile accepts a valid PDF under 2MB', () => {
  const result = validateCandidateDocumentFile({
    mimeType: 'application/pdf',
    size: 1024,
  });

  assert.equal(result.valid, true);
  assert.equal(result.error, null);
});

test('validateCandidateDocumentFile rejects a non-PDF file', () => {
  const result = validateCandidateDocumentFile({
    mimeType: 'image/png',
    size: 512,
  });

  assert.equal(result.valid, false);
  assert.match(result.error ?? '', /PDF/i);
});

test('buildDocumentStoragePath keeps CV in the dedicated folder and other docs in documents', () => {
  const cvPath = buildDocumentStoragePath('cand-123', 'cv', 'cv.pdf');
  const docPath = buildDocumentStoragePath('cand-123', 'motivation', 'lettre.pdf');

  assert.match(cvPath, /^candidates\/cand-123\/cv\//);
  assert.match(docPath, /^candidates\/cand-123\/documents\//);
});

test('normalizeCandidateDocumentType preserves distinct document categories and treats unknown values as other', () => {
  assert.equal(normalizeCandidateDocumentType('CV'), 'cv');
  assert.equal(normalizeCandidateDocumentType(' lettre de motivation '), 'motivation');
  assert.equal(normalizeCandidateDocumentType('letter'), 'motivation');
  assert.equal(normalizeCandidateDocumentType('cover_letter'), 'motivation');
  assert.equal(normalizeCandidateDocumentType('cover-letter'), 'motivation');
  assert.equal(normalizeCandidateDocumentType('diplome'), 'diploma');
  assert.equal(normalizeCandidateDocumentType('certificat'), 'certificate');
  assert.equal(normalizeCandidateDocumentType('autre'), 'other');
  assert.equal(normalizeCandidateDocumentType('inconnu'), 'other');
});

test('buildDocumentStoragePath uses distinct folders for CV and non-CV types', () => {
  const cvPath = buildDocumentStoragePath('cand-123', 'cv', 'cv.pdf');
  const motivationPath = buildDocumentStoragePath('cand-123', 'motivation', 'lettre.pdf');

  assert.notEqual(cvPath, motivationPath);
  assert.match(cvPath, /^candidates\/cand-123\/cv\//);
  assert.match(motivationPath, /^candidates\/cand-123\/documents\//);
});

test('candidate document local storage key matches the shared web structure', () => {
  const key = getCandidateDocumentsStorageKey('cand-123');

  assert.equal(key, 'emploiplus-candidate-documents-cand-123');
});
