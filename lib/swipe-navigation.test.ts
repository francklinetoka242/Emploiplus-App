import test from 'node:test';
import assert from 'node:assert/strict';

const {
  CANDIDATE_MAIN_TABS,
  getCurrentTabIndexFromPathname,
  getSwipeDirection,
  getSwipeTargetIndex,
} = await import('./swipe-navigation');

test('tab order is fixed and matches the required sequence', () => {
  assert.deepEqual(CANDIDATE_MAIN_TABS, ['menu', 'dashboard', 'jobs', 'fiches', 'settings']);
});

test('current tab detection reads the main route from pathname', () => {
  assert.equal(getCurrentTabIndexFromPathname('/candidate/menu'), 0);
  assert.equal(getCurrentTabIndexFromPathname('/candidate/dashboard'), 1);
  assert.equal(getCurrentTabIndexFromPathname('/candidate/jobs'), 2);
  assert.equal(getCurrentTabIndexFromPathname('/candidate/fiches'), 3);
  assert.equal(getCurrentTabIndexFromPathname('/candidate/settings'), 4);
});

test('left swipe progresses to the next tab while right swipe moves back', () => {
  assert.equal(getSwipeTargetIndex(0, 'left'), 1);
  assert.equal(getSwipeTargetIndex(1, 'left'), 2);
  assert.equal(getSwipeTargetIndex(2, 'left'), 3);
  assert.equal(getSwipeTargetIndex(3, 'left'), 4);

  assert.equal(getSwipeTargetIndex(1, 'right'), 0);
  assert.equal(getSwipeTargetIndex(2, 'right'), 1);
  assert.equal(getSwipeTargetIndex(3, 'right'), 2);
  assert.equal(getSwipeTargetIndex(4, 'right'), 3);
});

test('outer edges never loop', () => {
  assert.equal(getSwipeTargetIndex(0, 'right'), null);
  assert.equal(getSwipeTargetIndex(4, 'left'), null);
});

test('small vertical moves do not trigger horizontal navigation', () => {
  assert.equal(getSwipeDirection({ dx: 12, dy: 80, velocityX: 0 }), null);
  assert.equal(getSwipeDirection({ dx: 80, dy: 12, velocityX: 0 }), 'left');
  assert.equal(getSwipeDirection({ dx: -80, dy: 12, velocityX: 0 }), 'right');
});
