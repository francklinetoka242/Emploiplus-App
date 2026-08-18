import { supabase } from './supabase';

type CacheEntry<T> = {
  value: T;
  fetchedAt: number;
  ttlMs: number;
};

const MEMORY_CACHE = new Map<string, CacheEntry<any>>();

async function getSessionScope(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user?.id ?? 'anonymous';
}

export async function buildPageCacheKey(pageKey: string): Promise<string> {
  const userId = await getSessionScope();
  return `candidate:${userId}:${pageKey}`;
}

export async function readPageCache<T>(pageKey: string, ttlMs: number): Promise<{ value: T | null; fresh: boolean }> {
  const key = await buildPageCacheKey(pageKey);
  const entry = MEMORY_CACHE.get(key) as CacheEntry<T> | undefined;

  if (!entry) {
    return { value: null, fresh: false };
  }

  const ageMs = Date.now() - entry.fetchedAt;
  const fresh = ageMs <= Math.max(0, ttlMs || 0);

  return { value: entry.value, fresh };
}

export async function writePageCache<T>(pageKey: string, value: T, ttlMs: number): Promise<void> {
  const key = await buildPageCacheKey(pageKey);
  MEMORY_CACHE.set(key, {
    value,
    fetchedAt: Date.now(),
    ttlMs,
  });
}

export async function clearSessionPageCache(pageKey?: string): Promise<void> {
  const scope = await getSessionScope();

  if (pageKey) {
    const key = `candidate:${scope}:${pageKey}`;
    MEMORY_CACHE.delete(key);
    return;
  }

  for (const key of Array.from(MEMORY_CACHE.keys())) {
    if (key.startsWith(`candidate:${scope}:`)) {
      MEMORY_CACHE.delete(key);
    }
  }
}
