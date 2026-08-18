import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDocumentStoragePath,
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
