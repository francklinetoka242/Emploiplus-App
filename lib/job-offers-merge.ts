export function mergeUniqueJobOffers<T extends { id: string }>(existing: readonly T[], incoming: readonly T[]): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];

  for (const item of [...existing, ...incoming]) {
    if (!item || !item.id || seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    merged.push(item);
  }

  return merged;
}
