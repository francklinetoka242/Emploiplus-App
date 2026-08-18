import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
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

const TYPE_ALIASES: Record<string, CandidateDocumentTypeKey> = {
  cv: 'cv',
  'mon cv': 'cv',
  'curriculum vitae': 'cv',
  'curriculum-vitae': 'cv',
  'lettre de motivation': 'motivation',
  motivation: 'motivation',
  'lettre motivation': 'motivation',
  letter: 'motivation',
  'cover letter': 'motivation',
  'cover_letter': 'motivation',
  'cover-letter': 'motivation',
  diploma: 'diploma',
  diplome: 'diploma',
  'diplôme': 'diploma',
  certificate: 'certificate',
  certificat: 'certificate',
  certif: 'certificate',
  attestation: 'attestation',
  'attestation de travail': 'attestation',
  portfolio: 'portfolio',
  'recepisse acpe': 'recepisse',
  recepisse: 'recepisse',
  other: 'other',
  autre: 'other',
  'autre document': 'other',
};

export function normalizeCandidateDocumentType(type?: string | null): CandidateDocumentTypeKey {
  const raw = (type ?? '').trim().toLowerCase();
  if (!raw) {
    return 'other';
  }

  const directMatch = TYPE_ALIASES[raw];
  if (directMatch) {
    return directMatch;
  }

  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const aliasMatch = TYPE_ALIASES[normalized];
  if (aliasMatch) {
    return aliasMatch;
  }

  const knownType = CANDIDATE_DOCUMENT_TYPES.find((item) => item.value === normalized || item.label.toLowerCase() === normalized);
  if (knownType) {
    return knownType.value;
  }

  return 'other';
}

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

export function getCandidateDocumentsStorageKey(candidateId: string) {
  return `emploiplus-candidate-documents-${candidateId}`;
}

export type CandidateDocumentsLocalState = {
  cv?: CandidateDocumentRecord | null;
  documents?: CandidateDocumentRecord[];
};

function normalizePersistedDocument(raw: any, fallbackType?: CandidateDocumentTypeKey | string): CandidateDocumentRecord | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const customHint = typeof raw.customType === 'string'
    ? raw.customType
    : typeof raw.custom_type === 'string'
      ? raw.custom_type
      : typeof raw.displayName === 'string'
        ? raw.displayName
        : typeof raw.display_name === 'string'
          ? raw.display_name
          : undefined;

  const rawTypeValue = typeof raw.type === 'string'
    ? raw.type
    : typeof fallbackType === 'string'
      ? fallbackType
      : customHint ?? 'other';

  const type = normalizeCandidateDocumentType(
    normalizeCandidateDocumentType(rawTypeValue) === 'other' && customHint
      ? customHint
      : rawTypeValue
  );

  const path = typeof raw.path === 'string'
    ? raw.path
    : typeof raw.storagePath === 'string'
      ? raw.storagePath
      : typeof raw.storage_path === 'string'
        ? raw.storage_path
        : '';

  const storagePath = typeof raw.storagePath === 'string'
    ? raw.storagePath
    : typeof raw.storage_path === 'string'
      ? raw.storage_path
      : path;

  const displayName = typeof raw.displayName === 'string'
    ? raw.displayName
    : typeof raw.display_name === 'string'
      ? raw.display_name
      : getCandidateDocumentTypeLabel(type, raw.customType ?? raw.custom_type ?? null);

  const normalizedDoc: CandidateDocumentRecord = {
    id: raw.id ?? raw.path ?? storagePath ?? `${type}-${Date.now()}`,
    name: typeof raw.name === 'string' ? raw.name : path.split('/').pop() || 'document.pdf',
    path,
    storagePath,
    size: typeof raw.size === 'number' ? raw.size : undefined,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : undefined,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : undefined,
    type,
    url: typeof raw.url === 'string' ? raw.url : undefined,
    is_cv: Boolean(raw.is_cv || fallbackType === 'cv'),
    displayName,
    customType: raw.customType ?? raw.custom_type ?? null,
    date: typeof raw.date === 'string'
      ? raw.date
      : typeof raw.created_at === 'string'
        ? raw.created_at
        : typeof raw.updated_at === 'string'
          ? raw.updated_at
          : new Date().toISOString(),
  };

  return normalizedDoc;
}

async function readCandidateDocumentsLocalState(candidateId: string): Promise<CandidateDocumentsLocalState> {
  const key = getCandidateDocumentsStorageKey(candidateId);

  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      console.debug('[candidate-documents] localStorage missing', { candidateId, key, documentsCount: 0, documentTypes: [], documentNames: [], urls: [] });
      return { cv: null, documents: [] };
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      console.debug('[candidate-documents] localStorage invalid JSON', { candidateId, key, rawPreview: String(raw).slice(0, 200) });
      return { cv: null, documents: [] };
    }

    const documents = Array.isArray(parsed.documents)
      ? (parsed.documents
          .map((item: any) => normalizePersistedDocument(item))
          .filter(Boolean) as CandidateDocumentRecord[])
      : [];

    console.debug('[candidate-documents] localStorage read', {
      candidateId,
      key,
      documentsCount: documents.length,
      documentTypes: documents.map((doc) => doc.type ?? 'unknown'),
      documentNames: documents.map((doc) => doc.displayName || doc.name),
      urls: documents.map((doc) => doc.url ?? doc.storagePath ?? doc.path ?? ''),
    });

    const cv = parsed.cv
      ? (typeof parsed.cv === 'string'
          ? ({
              id: `local-cv-${candidateId}`,
              name: parsed.cv.split('/').pop() || 'CV candidat.pdf',
              path: parsed.cv,
              storagePath: parsed.cv,
              size: undefined,
              type: 'cv',
              url: parsed.cv,
              is_cv: true,
              displayName: 'Mon CV',
              customType: null,
              date: new Date().toISOString(),
            } satisfies CandidateDocumentRecord)
          : normalizePersistedDocument(parsed.cv, 'cv'))
      : null;

    return {
      cv,
      documents,
    };
  } catch (_error) {
    return { cv: null, documents: [] };
  }
}

async function writeCandidateDocumentsLocalState(candidateId: string, state: CandidateDocumentsLocalState) {
  const key = getCandidateDocumentsStorageKey(candidateId);
  const payload = {
    cv: state.cv ?? null,
    documents: Array.isArray(state.documents) ? state.documents : [],
  };

  await AsyncStorage.setItem(key, JSON.stringify(payload));
}

async function loadLegacyCandidateDocuments(candidateId: string): Promise<CandidateDocumentRecord[]> {
  try {
    const { data, error } = await supabase
      .from('candidate_documents')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) {
      return [];
    }

    return (data || []).map((doc: any) => {
      const normalizedType = normalizeCandidateDocumentType(doc.type);
      return {
        id: doc.id,
        name: doc.name,
        path: doc.storage_path,
        storagePath: doc.storage_path,
        size: doc.size,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        type: normalizedType,
        url: doc.url,
        displayName: doc.display_name || getCandidateDocumentTypeLabel(doc.type, doc.custom_type),
        customType: doc.custom_type,
        date: doc.created_at,
      } satisfies CandidateDocumentRecord;
    });
  } catch (_error) {
    return [];
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const cleaned = base64.replace(/\s/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function readFileAsBase64(uri: string): Promise<string> {
  try {
    let resolvedUri = uri;

    if (resolvedUri.startsWith('content://')) {
      resolvedUri = await FileSystemLegacy.getContentUriAsync(resolvedUri);
    }

    const info = await FileSystem.getInfoAsync(resolvedUri);
    if (!info.exists) {
      throw new Error('FILE_READ_FAILED');
    }

    return FileSystem.readAsStringAsync(resolvedUri, {
      encoding: 'base64',
    });
  } catch (_error) {
    throw new Error('FILE_READ_FAILED');
  }
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

export function buildDocumentStoragePath(candidateId: string, type: CandidateDocumentTypeKey | string, filename: string) {
  const safeType = normalizeCandidateDocumentType(type);
  const safeName = buildSafeStorageName(filename);
  const extension = safeName.includes('.') ? safeName.slice(safeName.lastIndexOf('.') + 1) || 'pdf' : 'pdf';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const folder = safeType === 'cv' ? `candidates/${candidateId}/cv` : `candidates/${candidateId}/documents`;
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
  const normalizedType = normalizeCandidateDocumentType(type);

  if (!type) {
    return customType?.trim() || 'Document';
  }

  const match = CANDIDATE_DOCUMENT_TYPES.find((item) => item.value === normalizedType);
  if (normalizedType === 'other') {
    return customType?.trim() || match?.label || 'Autre';
  }

  return match?.label || customType?.trim() || 'Document';
}

export async function addCandidateDocumentToDb(document: Omit<CandidateDocumentRecord, 'date'>, candidateId: string) {
  const normalizedType = normalizeCandidateDocumentType(document.type);
  const normalizedDisplayName = document.displayName?.trim() || getCandidateDocumentTypeLabel(normalizedType, document.customType);

  const { data, error } = await supabase
    .from('candidate_documents')
    .insert([
      {
        candidate_id: candidateId,
        name: document.name,
        storage_path: document.storagePath || document.path,
        type: normalizedType,
        custom_type: document.customType,
        display_name: normalizedDisplayName,
        size: document.size,
        url: document.url,
      },
    ])
    .select('*')
    .single();

  if (error) {
    console.warn('Failed to save document to database:', error);
    throw new Error(error.message || 'DOCUMENT_METADATA_SAVE_FAILED');
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

export async function listCandidateDocuments(forceRefresh = true): Promise<CandidateDocumentRecord[]> {
  const { candidate, error } = await getCurrentCandidateProfile({
    forceRefresh: true,
    useCache: false,
  });

  if (error || !candidate?.id) {
    throw error ?? new Error('PROFILE_NOT_FOUND');
  }

  const localState = await readCandidateDocumentsLocalState(candidate.id);
  const localDocuments = (localState.documents ?? []).map((doc) => ({
    ...doc,
    displayName: doc.displayName || getCandidateDocumentTypeLabel(doc.type, doc.customType),
    date: doc.date || doc.created_at || doc.updated_at || new Date().toISOString(),
    path: doc.path || doc.storagePath || `${candidate.id}/document`,
    storagePath: doc.storagePath || doc.path,
  }));

  console.debug('[candidate-documents] listCandidateDocuments', {
    candidateId: candidate.id,
    key: getCandidateDocumentsStorageKey(candidate.id),
    localDocumentsCount: localDocuments.length,
    localDocumentTypes: localDocuments.map((doc) => doc.type ?? 'unknown'),
    localDocumentNames: localDocuments.map((doc) => doc.displayName || doc.name),
    localDocumentUrls: localDocuments.map((doc) => doc.url ?? doc.storagePath ?? doc.path ?? ''),
    cvUrl: candidate.cv_url ?? null,
  });

  // CV logic: localStorage.cv has priority (local cache), fallback to candidates.cv_url (server source of truth)
  // This matches the Web app logic for document persistence
  let cvRecord: CandidateDocumentRecord[] = [];
  
  if (localState.cv) {
    // Use localStorage CV if available (highest priority)
    cvRecord = [{
      ...localState.cv,
      displayName: localState.cv.displayName || 'Mon CV',
      date: localState.cv.date || localState.cv.created_at || localState.cv.updated_at || new Date().toISOString(),
      path: localState.cv.path || localState.cv.storagePath || `${candidate.id}/cv`,
      storagePath: localState.cv.storagePath || localState.cv.path,
    }];
  } else if (candidate.cv_url) {
    // Fallback to server CV if localStorage is empty
    const cvStoragePath = (candidate.cv_url ?? '').trim();
    if (cvStoragePath) {
      const cvSignedUrl = await resolveStoragePathUrl(cvStoragePath);
      cvRecord = [{
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
      }];
    }
  }

  const fallbackDocuments = localDocuments.length > 0 ? localDocuments : await loadLegacyCandidateDocuments(candidate.id);
  const merged = [...cvRecord, ...fallbackDocuments];

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

  const typeKey = normalizeCandidateDocumentType(file.type ?? 'other');
  const documentDisplayName = file.displayName?.trim() || getCandidateDocumentTypeLabel(typeKey, file.customType);
  const storagePath = buildDocumentStoragePath(candidate.id, typeKey, file.name || 'document.pdf');

  let readableUri = file.uri;
  try {
    const base64 = await readFileAsBase64(readableUri);
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

    const localState = await readCandidateDocumentsLocalState(candidate.id);
    const nextDocuments = [
      metadataRecord,
      ...((localState.documents ?? []).filter((item) => {
        const candidateKey = item.id ?? item.path ?? item.storagePath ?? '';
        const metadataKey = metadataRecord.id ?? metadataRecord.path ?? metadataRecord.storagePath ?? '';
        return candidateKey !== metadataKey && (item.path ?? item.storagePath ?? '').trim() !== storagePath;
      })),
    ];
    await writeCandidateDocumentsLocalState(candidate.id, {
      cv: localState.cv ?? null,
      documents: nextDocuments,
    });

    // Save metadata to Supabase database. If it fails, do not pretend the document was created.
    const dbRecord = await addCandidateDocumentToDb(metadataRecord, candidate.id);
    if (!dbRecord?.id) {
      throw new Error('DOCUMENT_METADATA_SAVE_FAILED');
    }

    return {
      ...metadataRecord,
      id: dbRecord.id,
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
  const base64 = await readFileAsBase64(readableUri);
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
    const localState = await readCandidateDocumentsLocalState(candidate.id);
    const cvSignedUrl = await resolveStoragePathUrl(storagePath);
    const nextCvRecord: CandidateDocumentRecord = {
      id: `server-cv-${candidate.id}`,
      name: file.name || 'cv.pdf',
      path: storagePath,
      storagePath,
      size: file.size,
      type: 'cv',
      url: cvSignedUrl ?? storagePath,
      is_cv: true,
      displayName: 'Mon CV',
      customType: null,
      date: new Date().toISOString(),
    };
    await writeCandidateDocumentsLocalState(candidate.id, {
      cv: nextCvRecord,
      documents: localState.documents ?? [],
    });
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

  const localState = await readCandidateDocumentsLocalState(candidate.id);
  if (normalizedPath === (candidate.cv_url ?? '').trim()) {
    await supabase
      .from('candidates')
      .update({ cv_url: null, updated_at: new Date().toISOString() })
      .eq('id', candidate.id);
    await writeCandidateDocumentsLocalState(candidate.id, {
      cv: null,
      documents: localState.documents ?? [],
    });
    return;
  }

  await writeCandidateDocumentsLocalState(candidate.id, {
    cv: localState.cv ?? null,
    documents: (localState.documents ?? []).filter((item) => {
      const itemPath = item.path ?? item.storagePath ?? '';
      return itemPath.trim() !== normalizedPath && (item.id ?? item.path ?? item.storagePath ?? '').trim() !== (id ?? '').trim();
    }),
  });
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
