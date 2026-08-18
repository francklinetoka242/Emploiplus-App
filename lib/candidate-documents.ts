import * as FileSystemLegacy from 'expo-file-system/legacy';
import { getCurrentCandidateProfile } from './candidate-profile';
import { supabase } from './supabase';

export type CandidateDocumentTypeKey =
  | 'cv'
  | 'motivation'
  | 'diploma'
  | 'certificate'
  | 'attestation'
  | 'portfolio'
  | 'recepisse'
  | 'other';

export type CandidateDocument = {
  id?: string;
  name: string;
  path: string;
  storagePath?: string;
  size?: number;
  created_at?: string;
  updated_at?: string;
  type?: string;
  url?: string;
  is_cv?: boolean;
  displayName?: string;
  customType?: string | null;
};

export type CandidateDocumentRecord = CandidateDocument & {
  type: CandidateDocumentTypeKey | string;
  displayName: string;
  customType?: string | null;
  date: string;
};

export const CANDIDATE_DOCUMENT_TYPES: Array<{ value: CandidateDocumentTypeKey; label: string }> = [
  { value: 'cv', label: 'Mon CV' },
  { value: 'motivation', label: 'Lettre de motivation' },
  { value: 'diploma', label: 'Diplôme' },
  { value: 'certificate', label: 'Certificat' },
  { value: 'attestation', label: 'Attestation' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'recepisse', label: 'Récépissé ACPE' },
  { value: 'other', label: 'Autre' },
];

export const MAX_DOCUMENT_SIZE_BYTES = 2 * 1024 * 1024;
const STORAGE_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_CANDIDATE_BUCKET ?? process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET ?? 'candidat-doc';

function base64ToUint8Array(base64: string): Uint8Array {
  const cleaned = base64.replace(/\s/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function validateCandidateDocumentFile(file: { mimeType?: string; size?: number }) {
  const mimeType = (file.mimeType ?? 'application/pdf').toLowerCase();

  if (mimeType !== 'application/pdf') {
    return {
      valid: false,
      error: 'Seuls les fichiers PDF sont acceptés.',
    } as const;
  }

  if (typeof file.size === 'number' && file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Le fichier dépasse la limite de 2 Mo.',
    } as const;
  }

  return {
    valid: true,
    error: null,
  } as const;
}

function buildSafeStorageName(name: string) {
  const normalized = (name || 'document.pdf')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .toLowerCase();

  return normalized || 'document.pdf';
}

export function buildDocumentStoragePath(candidateId: string, type: CandidateDocumentTypeKey, filename: string) {
  const safeName = buildSafeStorageName(filename);
  const extension = safeName.includes('.') ? safeName.slice(safeName.lastIndexOf('.') + 1) || 'pdf' : 'pdf';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const folder = type === 'cv' ? `candidates/${candidateId}/cv` : `candidates/${candidateId}/documents`;
  return `${folder}/${fileName}`;
}

export async function resolveStoragePathUrl(path: string): Promise<string | undefined> {
  const trimmed = (path ?? '').trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  try {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(trimmed, 3600);
    if (error || !data?.signedUrl) {
      return undefined;
    }

    return data.signedUrl;
  } catch (_error) {
    return undefined;
  }
}

export function getCandidateDocumentTypeLabel(type: string | undefined, customType?: string | null) {
  if (!type) {
    return customType?.trim() || 'Document';
  }

  const match = CANDIDATE_DOCUMENT_TYPES.find((item) => item.value === type);
  if (type === 'other') {
    return customType?.trim() || match?.label || 'Autre';
  }

  return match?.label || customType?.trim() || 'Document';
}

export async function addCandidateDocumentToDb(document: Omit<CandidateDocumentRecord, 'date'>, candidateId: string) {
  const { data, error } = await supabase
    .from('candidate_documents')
    .insert([
      {
        candidate_id: candidateId,
        name: document.name,
        storage_path: document.storagePath || document.path,
        type: document.type,
        custom_type: document.customType,
        display_name: document.displayName,
        size: document.size,
        url: document.url,
      },
    ])
    .select('*')
    .single();

  if (error) {
    console.warn('Failed to save document to database:', error);
    // Return local object if DB save fails
    return {
      id: document.id,
      candidate_id: candidateId,
      name: document.name,
      storage_path: document.storagePath || document.path,
      type: document.type,
      custom_type: document.customType,
      display_name: document.displayName,
      size: document.size,
      url: document.url,
      created_at: document.created_at,
      updated_at: document.updated_at,
    } as any;
  }
  return data;
}

export async function deleteCandidateDocumentFromDb(id: string) {
  const { error } = await supabase
    .from('candidate_documents')
    .delete()
    .eq('id', id);

  if (error) {
    console.warn('Failed to delete document from database:', error);
  }
}

export async function listCandidateDocuments(): Promise<CandidateDocumentRecord[]> {
  const { candidate, error } = await getCurrentCandidateProfile();

  if (error || !candidate?.id) {
    throw error ?? new Error('PROFILE_NOT_FOUND');
  }

  // Get CV from profile
  const cvStoragePath = typeof candidate.cv_url === 'string' ? candidate.cv_url.trim() : '';
  const cvSignedUrl = cvStoragePath ? await resolveStoragePathUrl(cvStoragePath) : undefined;
  const cvRecord = cvStoragePath
    ? [{
        id: `server-cv-${candidate.id}`,
        name: cvStoragePath.split('/').pop() || 'CV candidat.pdf',
        path: cvStoragePath,
        storagePath: cvStoragePath,
        size: undefined,
        created_at: candidate.updated_at ?? new Date().toISOString(),
        updated_at: candidate.updated_at ?? new Date().toISOString(),
        type: 'cv',
        url: cvSignedUrl ?? cvStoragePath,
        is_cv: true,
        displayName: 'Mon CV',
        customType: null,
        date: candidate.updated_at ?? new Date().toISOString(),
      } satisfies CandidateDocumentRecord]
    : [];

  // Get documents from database
  const { data: dbDocuments, error: dbError } = await supabase
    .from('candidate_documents')
    .select('*')
    .eq('candidate_id', candidate.id)
    .order('created_at', { ascending: false });
  if (dbError) {
    console.warn('Failed to load documents from database:', dbError);
  }
  const documents = (dbDocuments || []).map((doc: any) => ({
    id: doc.id,
    name: doc.name,
    path: doc.storage_path,
    storagePath: doc.storage_path,
    size: doc.size,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    type: doc.type,
    url: doc.url,
    displayName: doc.display_name || getCandidateDocumentTypeLabel(doc.type, doc.custom_type),
    customType: doc.custom_type,
    date: doc.created_at,
  } satisfies CandidateDocumentRecord));

  const merged = [...cvRecord, ...documents];

  const uniqueById = new Map<string, CandidateDocumentRecord>();
  for (const doc of merged) {
    const key = doc.id ?? doc.storagePath ?? doc.path ?? `${doc.name}-${doc.date}`;
    uniqueById.set(key, {
      ...doc,
      displayName: doc.displayName || getCandidateDocumentTypeLabel(doc.type, doc.customType),
      date: doc.date || doc.created_at || doc.updated_at || new Date().toISOString(),
      path: doc.path || doc.storagePath || `${candidate.id}/document`,
      storagePath: doc.storagePath || doc.path,
    });
  }

  return [...uniqueById.values()].sort((a, b) => new Date(b.date ?? b.created_at ?? 0).getTime() - new Date(a.date ?? a.created_at ?? 0).getTime());
}

export async function uploadCandidateDocument(file: {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
  type?: CandidateDocumentTypeKey;
  customType?: string;
  displayName?: string;
}) {
  const { candidate, error } = await getCurrentCandidateProfile();

  if (error || !candidate?.id) {
    throw error ?? new Error('PROFILE_NOT_FOUND');
  }

  const validation = validateCandidateDocumentFile({ mimeType: file.mimeType, size: file.size });
  if (!validation.valid) {
    throw new Error(validation.error ?? 'DOCUMENT_INVALID');
  }

  const typeKey = file.type ?? 'other';
  const documentDisplayName = file.displayName?.trim() || getCandidateDocumentTypeLabel(typeKey, file.customType);
  const storagePath = buildDocumentStoragePath(candidate.id, typeKey, file.name || 'document.pdf');

  let readableUri = file.uri;
  try {
    if (readableUri.startsWith('content://')) {
      readableUri = await FileSystemLegacy.getContentUriAsync(readableUri);
    }

    const fileInfo = await FileSystemLegacy.getInfoAsync(readableUri);
    if (!fileInfo.exists) {
      throw new Error('FILE_READ_FAILED');
    }

    const base64 = await FileSystemLegacy.readAsStringAsync(readableUri, {
      encoding: 'base64',
    });
    const bytes = base64ToUint8Array(base64);

    const { data, error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, bytes, {
      contentType: 'application/pdf',
      upsert: false,
    });

    if (uploadError) {
      throw uploadError;
    }

    const signedUrl = await resolveStoragePathUrl(storagePath);

    // Determine final file size - prefer actual file size, fallback to computed size
    let finalSize = 0;
    if (typeof file.size === 'number' && file.size > 0) {
      finalSize = file.size;
    } else {
      finalSize = bytes.length || (base64.length * 3) / 4; // Estimate from base64 length
    }

    const metadataRecord: CandidateDocumentRecord = {
      id: data?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name || 'document.pdf',
      path: storagePath,
      storagePath,
      size: finalSize,
      type: typeKey,
      url: signedUrl ?? storagePath,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      displayName: documentDisplayName,
      customType: file.customType?.trim() || null,
      date: new Date().toISOString(),
    };

    // Save metadata to Supabase database
    const dbRecord = await addCandidateDocumentToDb(metadataRecord, candidate.id);
    
    return {
      ...metadataRecord,
      id: dbRecord?.id || metadataRecord.id,
    };
  } catch (error: any) {
    throw error;
  }
}

export async function saveCandidateCv(file: { uri: string; name: string; mimeType?: string; size?: number }) {
  const validation = validateCandidateDocumentFile({ mimeType: file.mimeType, size: file.size });
  if (!validation.valid) {
    throw new Error(validation.error ?? 'DOCUMENT_INVALID');
  }

  const { candidate, error } = await getCurrentCandidateProfile();
  if (error || !candidate) {
    throw error ?? new Error('PROFILE_NOT_FOUND');
  }

  const storagePath = buildDocumentStoragePath(candidate.id, 'cv', file.name || 'cv.pdf');
  let readableUri = file.uri;
  if (readableUri.startsWith('content://')) {
    readableUri = await FileSystemLegacy.getContentUriAsync(readableUri);
  }

  const fileInfo = await FileSystemLegacy.getInfoAsync(readableUri);
  if (!fileInfo.exists) {
    throw new Error('FILE_READ_FAILED');
  }

  const base64 = await FileSystemLegacy.readAsStringAsync(readableUri, {
    encoding: 'base64',
  });
  const bytes = base64ToUint8Array(base64);

  const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, bytes, {
    contentType: 'application/pdf',
    upsert: false,
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data, error: updateError } = await supabase
    .from('candidates')
    .update({ cv_url: storagePath, updated_at: new Date().toISOString() })
    .eq('id', candidate.id)
    .select('*')
    .single();

  if (updateError) {
    throw updateError;
  }

  try {
    await extractCandidateCvText();
  } catch (_error) {
    // Extraction IA is optional and should not break the upload flow.
  }

  return data;
}

export async function deleteCandidateDocument(path: string, id?: string) {
  const { candidate, error: profileError } = await getCurrentCandidateProfile();
  if (profileError || !candidate?.id) {
    throw profileError ?? new Error('PROFILE_NOT_FOUND');
  }

  const normalizedPath = (path ?? '').trim();
  if (!normalizedPath) {
    throw new Error('DOCUMENT_PATH_REQUIRED');
  }

  if (!normalizedPath.includes(`candidates/${candidate.id}/`)) {
    throw new Error('INVALID_DOCUMENT_OWNER');
  }

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([normalizedPath]);
  if (error) {
    throw error;
  }

  if (id) {
    await deleteCandidateDocumentFromDb(id);
  } else if (normalizedPath !== (candidate.cv_url ?? '').trim()) {
    // TODO: Uncomment when migration is applied
    // Try to find and delete the record by storage_path if no id provided
    // const { error: deleteError } = await supabase
    //   .from('candidate_documents')
    //   .delete()
    //   .eq('candidate_id', candidate.id)
    //   .eq('storage_path', normalizedPath);
    // 
    // if (deleteError) {
    //   console.warn('Failed to delete document from database:', deleteError);
    // }
  }

  if (normalizedPath === (candidate.cv_url ?? '').trim()) {
    await supabase
      .from('candidates')
      .update({ cv_url: null, updated_at: new Date().toISOString() })
      .eq('id', candidate.id);
  }
}

export async function extractCandidateCvText() {
  const { candidate, error } = await getCurrentCandidateProfile();

  if (error || !candidate) {
    throw error ?? new Error('PROFILE_NOT_FOUND');
  }

  if (!candidate.cv_url) {
    return { text: null, source: 'none' as const };
  }

  const endpoint = process.env.EXPO_PUBLIC_CV_EXTRACTION_URL;
  if (!endpoint) {
    return {
      text: null,
      source: 'not-configured' as const,
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      candidate_id: candidate.id,
      cv_url: candidate.cv_url,
    }),
  });

  if (!response.ok) {
    throw new Error('CV_EXTRACTION_FAILED');
  }

  const payload = await response.json();
  const extractedText =
    (typeof payload?.text === 'string' && payload.text.trim()) ||
    (typeof payload?.cv_text === 'string' && payload.cv_text.trim()) ||
    null;

  if (extractedText) {
    const { error: updateError } = await supabase
      .from('candidates')
      .update({ cv_text: extractedText, updated_at: new Date().toISOString() })
      .eq('id', candidate.id);

    if (updateError) {
      throw updateError;
    }
  }

  return {
    text: extractedText,
    source: 'api' as const,
  };
}
