export const CANDIDATE_MAIN_TABS = ['menu', 'dashboard', 'jobs', 'fiches', 'settings'] as const;

export type CandidateTabName = (typeof CANDIDATE_MAIN_TABS)[number];
export type SwipeDirection = 'left' | 'right';

export function getCurrentTabIndexFromPathname(pathname: string | null | undefined): number {
  if (!pathname) {
    return 0;
  }

  const normalized = pathname.replace(/\?.*$/, '').replace(/#.*$/, '');
  const match = normalized.match(/\/candidate\/(?:\(tabs\))?([^/?]+)/);
  const routeName = match?.[1] ?? 'jobs';

  const tabIndex = CANDIDATE_MAIN_TABS.indexOf(routeName as CandidateTabName);
  return tabIndex >= 0 ? tabIndex : 0;
}

export function getSwipeDirection({ dx, dy, velocityX }: { dx: number; dy: number; velocityX: number }): SwipeDirection | null {
  if (Math.abs(dx) <= Math.abs(dy)) {
    return null;
  }

  if (Math.abs(dx) < 24 && Math.abs(velocityX) < 0.25) {
    return null;
  }

  return dx < 0 ? 'left' : 'right';
}

export function getSwipeTargetIndex(currentIndex: number, direction: SwipeDirection): number | null {
  if (direction === 'left') {
    if (currentIndex >= CANDIDATE_MAIN_TABS.length - 1) {
      return null;
    }
    return currentIndex + 1;
  }

  if (direction === 'right') {
    if (currentIndex <= 0) {
      return null;
    }
    return currentIndex - 1;
  }

  return null;
}

export function getRouteFromTabIndex(index: number): string {
  const tabName = CANDIDATE_MAIN_TABS[index] ?? CANDIDATE_MAIN_TABS[0];
  return `/candidate/${tabName}`;
}
