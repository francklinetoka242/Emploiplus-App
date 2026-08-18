export type DuplicateKeyDebugResult<T> = {
  duplicateKeys: Array<string | number>;
  occurrences: Map<string | number, number[]>;
  totalItems: number;
};

type DebugLogger = Pick<Console, 'log' | 'warn' | 'info' | 'error'>;

const ENABLE_DEBUG_LOGS = true;

function emitDebugLog(logger: DebugLogger, label: string, payload: Record<string, unknown>) {
  if (!ENABLE_DEBUG_LOGS) {
    return;
  }

  const compactPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  if (typeof logger.log === 'function') {
    logger.log(label, compactPayload);
    return;
  }

  if (typeof logger.info === 'function') {
    logger.info(label, compactPayload);
    return;
  }

  if (typeof logger.warn === 'function') {
    logger.warn(label, compactPayload);
  }
}

export function debugDuplicateKeys<T>(
  componentName: string,
  listName: string,
  items: readonly T[] | null | undefined,
  getKey: (item: T, index: number) => string | number | null | undefined,
  logger: DebugLogger = console,
): DuplicateKeyDebugResult<T> {
  const safeItems = Array.isArray(items) ? items : [];
  const occurrences = new Map<string | number, number[]>();
  const duplicateKeys: Array<string | number> = [];

  for (let index = 0; index < safeItems.length; index += 1) {
    const item = safeItems[index];
    const rawKey = getKey(item, index);
    const key = rawKey == null ? `__undefined__:${index}` : String(rawKey);
    const positions = occurrences.get(key) ?? [];

    positions.push(index);
    occurrences.set(key, positions);
  }

  for (const [key, indexes] of occurrences.entries()) {
    if (indexes.length > 1) {
      duplicateKeys.push(key);
    }
  }

  if (duplicateKeys.length > 0) {
    for (const duplicateKey of duplicateKeys) {
      const indexes = occurrences.get(duplicateKey) ?? [];
      const firstIndex = indexes[0];
      const secondIndex = indexes[1];
      const firstItem = safeItems[firstIndex];
      const secondItem = safeItems[secondIndex];

      emitDebugLog(logger, '[DUPLICATE KEY RUNTIME]', {
        component: componentName,
        list: listName,
        key: duplicateKey,
        occurrences: indexes.length,
        totalItems: safeItems.length,
        firstIndex,
        secondIndex,
        keyType: typeof duplicateKey,
      });

      emitDebugLog(logger, '[DUPLICATE KEY DETECTED]', {
        component: componentName,
        list: listName,
        key: duplicateKey,
        occurrences: indexes.length,
        totalItems: safeItems.length,
        firstIndex,
        secondIndex,
      });
    }
  }

  return {
    duplicateKeys,
    occurrences,
    totalItems: safeItems.length,
  };
}

export function debugExactUuidInList<T>(
  componentName: string,
  listName: string,
  items: readonly T[] | null | undefined,
  getKey: (item: T, index: number) => string | number | null | undefined,
  targetUuid: string,
  logger: DebugLogger = console,
): boolean {
  const safeItems = Array.isArray(items) ? items : [];

  for (let index = 0; index < safeItems.length; index += 1) {
    const item = safeItems[index];
    const key = getKey(item, index);
    const keyValue = key == null ? '' : String(key);
    if (keyValue === targetUuid) {
      emitDebugLog(logger, '[!!! TARGET UUID FOUND !!!]', {
        component: componentName,
        list: listName,
        index,
        key: keyValue,
        keyType: typeof keyValue,
        source: 'list item key match',
      });
      return true;
    }
  }

  return false;
}

export function logSourceData<T>(
  functionName: string,
  tableName: string,
  items: readonly T[] | null | undefined,
  getId: (item: T, index: number) => string | null | undefined,
  logger: DebugLogger = console,
) {
  const safeItems = Array.isArray(items) ? items : [];
  const ids = safeItems.map((item, index) => getId(item, index)).filter((value): value is string => Boolean(value));
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

  emitDebugLog(logger, '[SOURCE DATA]', {
    function: functionName,
    table: tableName,
    count: ids.length,
    uniqueIds: Array.from(new Set(ids)).length,
    duplicateIds: Array.from(new Set(duplicates)).length,
  });
}

export function logStateUpdate<T>(
  componentName: string,
  listName: string,
  previousCount: number,
  incomingCount: number,
  resultCount: number,
  previousIds: readonly string[],
  incomingIds: readonly string[],
  resultIds: readonly string[],
  logger: DebugLogger = console,
) {
  const duplicates = resultIds.filter((id, index) => resultIds.indexOf(id) !== index);

  emitDebugLog(logger, '[STATE UPDATE]', {
    component: componentName,
    list: listName,
    previousCount,
    incomingCount,
    resultCount,
    duplicateIds: Array.from(new Set(duplicates)).length,
  });
}

export function logRenderTrace<T>(
  componentName: string,
  listName: string,
  items: readonly T[] | null | undefined,
  getId: (item: T, index: number) => string | null | undefined,
  logger: DebugLogger = console,
) {
  const safeItems = Array.isArray(items) ? items : [];
  const ids = safeItems.map((item, index) => getId(item, index)).filter((value): value is string => Boolean(value));
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

  emitDebugLog(logger, '[TRACE]', {
    component: componentName,
    list: listName,
    beforeRenderCount: safeItems.length,
    uniqueIds: Array.from(new Set(ids)).length,
    duplicates: Array.from(new Set(duplicates)).length,
  });
}

/**
 * Example usage:
 *
 * debugDuplicateKeys('CandidateFichesScreen', 'guides', guides, (guide) => guide?.id);
 * debugExactUuidInList('CandidateFichesScreen', 'guides', guides, (guide) => guide?.id, 'f4f29e28-f276-40e4-bbfa-553acd7cdf94');
 * logSourceData('fetchCandidateNotifications', 'notifications', data, (item) => item?.id);
 */
