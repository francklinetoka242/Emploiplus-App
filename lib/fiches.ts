import { supabase } from './supabase';
import { logSourceData } from './debug-duplicate-keys';

export type LocalGuideRecord = {
  id: string;
  title: string | null;
  slug: string | null;
  category: string | null;
  description: string | null;
  image_url: string | null;
  document_url: string | null;
  visible: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

const dedupeLocalGuides = (items: LocalGuideRecord[]) => {
  const unique = new Map<string, LocalGuideRecord>();

  for (const item of items) {
    if (!item?.id) {
      continue;
    }

    if (!unique.has(item.id)) {
      unique.set(item.id, item);
    }
  }

  return Array.from(unique.values());
};

export async function fetchLocalGuides(options?: { visibleOnly?: boolean }) {
  let query = supabase.from('local_guides').select('*').order('created_at', { ascending: false, nullsFirst: false });

  if (options?.visibleOnly) {
    query = query.eq('visible', true);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rawData = (data ?? []) as LocalGuideRecord[];
  const normalized = dedupeLocalGuides(rawData);
  return normalized;
}
