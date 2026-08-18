# Flux Documents mobile

Page concernée : `app/candidate/documents.tsx` ; composant principal : `CandidateDocumentsScreen`.

## 1) Chargement
`useEffect(() => loadDocuments(), [loadDocuments])` appelle `listCandidateDocuments()` dans `lib/candidate-documents.ts`.

`loadDocuments()` :
- vide `error`
- appelle `listCandidateDocuments(forceRefresh)`
- met `documents` dans l’état
- met `loading` / `refreshing` à `false` dans le `finally`

## 2) Identité du candidat
`getCurrentCandidateProfile()` dans `lib/candidate-profile.ts` récupère l’utilisateur connecté via `supabase.auth.getUser()`, puis le candidat via :
- `supabase.from('candidates').select('*').eq('user_id', user.id).maybeSingle()`

Le candidat est identifié par `candidate.id`.

## 3) CV
Le CV est lu depuis `candidates.cv_url`.
- `listCandidateDocuments()` : `const cvStoragePath = typeof candidate.cv_url === 'string' ? candidate.cv_url.trim() : '';`
- si `cvStoragePath` existe, `resolveStoragePathUrl(cvStoragePath)` tente :
  `supabase.storage.from(bucket).createSignedUrl(path, 3600)`
- si c’est déjà une URL HTTP(S), elle est renvoyée telle quelle
- le résultat devient `url` du document CV et est affiché comme `Mon CV`

`saveCandidateCv()` upload le PDF dans Storage puis met à jour `candidates.cv_url`.

## 4) Autres documents
Les autres documents sont traités par `listCandidateDocuments()` via le stockage local du candidat :
- clé `emploiplus-candidate-documents-${candidateId}`
- structure `{ cv, documents }`

Le service les normalise ensuite en `CandidateDocumentRecord` et les ajoute au rendu final.

Il y a aussi une compatibilité legacy avec `candidate_documents` :
- `supabase.from('candidate_documents').select('*').eq('candidate_id', candidate.id)`
- colonnes utilisées : `candidate_id`, `storage_path`, `type`, `custom_type`, `display_name`, `size`, `url`, `created_at`

## 5) Types de documents
`CANDIDATE_DOCUMENT_TYPES` dans `lib/candidate-documents.ts` contient : `cv`, `motivation`, `diploma`, `certificate`, `attestation`, `portfolio`, `recepisse`, `other`.
`normalizeCandidateDocumentType()` transforme libellés comme `CV`, `diplome`, `certificat`, `lettre de motivation` en ces clés.

## 6) Storage
`buildDocumentStoragePath(candidateId, type, filename)` construit les chemins :
- CV : `candidates/{candidateId}/cv/...`
- autres docs : `candidates/{candidateId}/documents/...`

Bucket réel dans le code :
`EXPO_PUBLIC_SUPABASE_CANDIDATE_BUCKET ?? EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET ?? 'candidat-doc'`

## 7) Upload / suppression
`uploadCandidateDocument()` :
- valide PDF (`application/pdf`, taille < 2 Mo)
- upload dans Storage via `supabase.storage.from(bucket).upload(path, bytes, ...)`
- crée un document local / métadonnées
- enregistre la structure locale `{ cv, documents }`

`deleteCandidateDocument()` :
- supprime le fichier Storage
- si c’est le CV, met `candidates.cv_url = null`
- sinon supprime le document local concerné

## 8) Affichage
Dans `CandidateDocumentsScreen`, chaque document est affiché comme :
- nom : `document.displayName || document.name`
- taille : `formatBytes(document.size)`
- bouton ouvrir : `Linking.openURL(targetUrl)`
- bouton supprimer : `deleteCandidateDocument(...)`

Conditions d’absence :
- `candidate` non trouvé
- `cv_url` vide
- document absent du stockage local
- `targetUrl` introuvable
- ouverture impossible via `Linking.canOpenURL`
- fichier non PDF ou trop lourd

## 9) Différence CV / autres documents
Le code distingue explicitement le CV (`candidates.cv_url`) des autres documents (stockage local + compatibilité legacy `candidate_documents`). Le CV suit donc un chemin de récupération distinct des autres documents.
