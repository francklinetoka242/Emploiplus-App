import test from 'node:test';
import assert from 'node:assert/strict';

import { mergeUniqueJobOffers } from './job-offers-merge.ts';

test('mergeUniqueJobOffers removes duplicate job ids while preserving the first occurrence order', () => {
  const existing = [
    { id: 'a', title: 'Alpha' },
    { id: 'b', title: 'Bravo' },
  ] as any;

  const incoming = [
    { id: 'b', title: 'Bravo duplicate' },
    { id: 'c', title: 'Charlie' },
    { id: 'a', title: 'Alpha duplicate' },
  ] as any;

  const merged = mergeUniqueJobOffers(existing, incoming);

  assert.deepEqual(
    merged.map((job: any) => job.id),
    ['a', 'b', 'c'],
  );
});
