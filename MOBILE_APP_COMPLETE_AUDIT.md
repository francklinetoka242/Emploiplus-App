# Audit complet de l’application mobile Emploiplus

## 1. Résumé exécutif

L’application mobile est une application Expo / React Native orientée candidat, avec une architecture de routage par fichiers et un backend Supabase. Le cœur fonctionnel est centré sur l’espace candidat : authentification, profil, documents, offres d’emploi, candidatures, notifications, fiches pratiques et réglages.

Le projet est en phase de mise en place fonctionnelle avancée, avec plusieurs modules bien structurés et plusieurs fonctionnalités déjà effectivement implémentées dans le code. Les points forts sont :

- Authentification réelle via Supabase avec session persistée et redirection automatique.
- Gestion robuste du profil candidat avec cache local, complétion de profil et données associées.
- Parcours de recherche et de consultation d’offres actives.
- Sauvegarde des offres et suivi des candidatures.
- Gestion de CV et documents PDF dans Supabase Storage.
- Menu latéral à usage web / mobile, restreint à l’action “Menu” selon l’UX cible.
- Constructions de navigation et d’access control autour de la route candidat.

Les points de vigilance identifiés sont :

- Des fonctionnalités qui restent en attente de migration de persistance côté base, notamment les documents métier dans une table dédiée.
- Une logique de menu / tabs qui a nécessité une distinction explicite entre “onglet menu” et “drawer latéral”.
- Des logs de diagnostic qui existent encore dans un module utilitaire, mais sous une forme compactée et contrôlée.
- Une forte dépendance à la configuration Supabase et au profil candidat pour de nombreuses features.

## 2. Périmètre fonctionnel

### 2.1. Modules présents dans l’application

Le périmètre observable correspond aux écrans de l’espace candidat et aux utilitaires associés :

- [app/_layout.tsx](app/_layout.tsx)
- [app/auth/index.tsx](app/auth/index.tsx)
- [app/auth/login.tsx](app/auth/login.tsx)
- [app/auth/signup.tsx](app/auth/signup.tsx)
- [app/auth/forgot-password.tsx](app/auth/forgot-password.tsx)
- [app/auth/confirm-email.tsx](app/auth/confirm-email.tsx)
- [app/candidate/_layout.tsx](app/candidate/_layout.tsx)
- [app/candidate/(tabs)/_layout.tsx](app/candidate/(tabs)/_layout.tsx)
- [app/candidate/(tabs)/dashboard.tsx](app/candidate/(tabs)/dashboard.tsx)
- [app/candidate/(tabs)/jobs.tsx](app/candidate/(tabs)/jobs.tsx)
- [app/candidate/(tabs)/fiches.tsx](app/candidate/(tabs)/fiches.tsx)
- [app/candidate/(tabs)/settings.tsx](app/candidate/(tabs)/settings.tsx)
- [app/candidate/(tabs)/menu.tsx](app/candidate/(tabs)/menu.tsx)
- [app/candidate/account.tsx](app/candidate/account.tsx)
- [app/candidate/documents.tsx](app/candidate/documents.tsx)
- [app/candidate/notifications.tsx](app/candidate/notifications.tsx)
- [app/candidate/profile](app/candidate/profile)
- [app/candidate/saved-jobs.tsx](app/candidate/saved-jobs.tsx)
- [app/candidate/applications/index.tsx](app/candidate/applications/index.tsx)
- [app/candidate/guides.tsx](app/candidate/guides.tsx)
- [app/candidate/guides-usage.tsx](app/candidate/guides-usage.tsx)
- [app/candidate/subscription.tsx](app/candidate/subscription.tsx)

## 3. Architecture technique

### 3.1. Stack applicative

Le projet repose sur :

- Expo SDK / Expo Router
- React Native
- TypeScript
- Supabase JS client
- SecureStore pour la persistance de session
- SafeAreaContext pour la gestion des zones sûres
- Expo document picker, file system et linking

Source principale : [package.json](package.json)

### 3.2. Authentification et session

Le point d’entrée de session est [lib/supabase.ts](lib/supabase.ts). Il initialise le client Supabase avec :

- URL publique Supabase
- clé anonyme publique
- stockage sécurisé via expo-secure-store
- persistSession activé
- autoRefreshToken activé
- detectSessionInUrl activé

La protection de routes se fait dans [app/_layout.tsx](app/_layout.tsx) via :

- vérification de la présence d’un statut de session
- contrôle que l’utilisateur a un profil candidat associé
- redirection vers /auth ou /candidate/jobs selon le cas
- gestion de onAuthStateChange

### 3.3. Navigation

La navigation est mixée entre :

- routage Expo file-based classique
- onglets candidats avec whitelist stricte
- drawer latéral pour le menu

Le moteur principal est [app/candidate/(tabs)/_layout.tsx](app/candidate/(tabs)/_layout.tsx), avec :

- barre d’onglets de type “Menu / Dashboard / Jobs / Fiches / Settings”
- affichage de l’écran actif selon le pathname
- ouverture d’un drawer au clic sur “Menu”
- navigation vers les routes internes par router.push / router.replace

Le mapping des tabs est contrôlé dans [lib/swipe-navigation.ts](lib/swipe-navigation.ts).

## 4. Documentation fonctionnelle

### 4.1. Parcours d’inscription / connexion

#### Statut : IMPLEMENTÉ

- Écran d’accueil : [app/auth/index.tsx](app/auth/index.tsx)
- Inscription : [app/auth/signup.tsx](app/auth/signup.tsx)
- Connexion : [app/auth/login.tsx](app/auth/login.tsx)
- Récupération de mot de passe : [app/auth/forgot-password.tsx](app/auth/forgot-password.tsx)
- Confirmation email : [app/auth/confirm-email.tsx](app/auth/confirm-email.tsx)

Fonctionnement observé :

- Validation des champs email / mot de passe.
- Vérification de confirmation email avant affichage de l’accès.
- Vérification du profil candidat associé au compte.
- Redirection automatique vers /candidate/jobs si la session est valide.
- Déconnexion intégrée sur erreurs ou si le profil est absent.

### 4.2. Tableau de bord candidat

#### Statut : IMPLEMENTÉ

Fichier principal : [app/candidate/(tabs)/dashboard.tsx](app/candidate/(tabs)/dashboard.tsx)

Ce module affiche :

- score de complétion du profil
- liste des candidatures récentes
- offres recommandées via RPC match_job_offers_for_candidate
- notifications récentes
- checklist des éléments manquants

La logique de score est appuyée par [lib/candidate-profile.ts](lib/candidate-profile.ts) et [lib/profile-completion.ts](lib/profile-completion.ts).

### 4.3. Recherche et consultation des offres

#### Statut : IMPLEMENTÉ

Fichier principal : [app/candidate/(tabs)/jobs.tsx](app/candidate/(tabs)/jobs.tsx)

Ce module couvre :

- recherche textuelle
- filtres par contrat et localisation
- pagination
- sauvegarde d’offres
- navigation vers la fiche détaillée de l’offre

Les services de données sont dans [lib/jobs.ts](lib/jobs.ts), notamment :

- fetchJobOffers
- fetchJobFilterOptions
- getConnectedCandidate
- toggleSavedOfferForCandidate
- fetchSavedOffersForCandidate

### 4.4. Fiche détaillée d’offre et candidature

#### Statut : IMPLEMENTÉ

Le dossier [app/candidate/jobs](app/candidate/jobs) contient le parcours d’offre :

- [app/candidate/jobs/[id].tsx](app/candidate/jobs/[id].tsx)
- [app/candidate/jobs/[id]/apply.tsx](app/candidate/jobs/[id]/apply.tsx)
- [app/candidate/jobs/confirmation.tsx](app/candidate/jobs/confirmation.tsx)

Le comportement est de :

- afficher les détails de l’offre
- permettre la candidature
- enregistrer la candidature dans la table job_applications
- rediriger vers le parcours de confirmation ou vers l’accueil des candidatures

### 4.5. Candidatures

#### Statut : IMPLEMENTÉ

Fichier principal : [app/candidate/applications/index.tsx](app/candidate/applications/index.tsx)

Ce module :

- récupère les candidatures du candidat connecté
- affiche le statut selon un mapping métier
- permet l’ouverture de la fiche de l’offre concernée

### 4.6. Offres enregistrées

#### Statut : IMPLEMENTÉ

Fichier principal : [app/candidate/saved-jobs.tsx](app/candidate/saved-jobs.tsx)

Fonctionnalité :

- liste des offres sauvegardées via la table candidate_saved_offers
- chargement filtré par candidat courant
- navigation vers les détails de l’offre

### 4.7. Notifications

#### Statut : IMPLEMENTÉ

Fichier principal : [app/candidate/notifications.tsx](app/candidate/notifications.tsx)

Fonctionne via [lib/notifications.ts](lib/notifications.ts) :

- fetchCandidateNotifications
- markNotificationAsRead
- markAllNotificationsAsRead
- subscribeToCandidateNotifications

### 4.8. Documents candidat

#### Statut : PARTIEL / PRÉVU

Fichiers principaux :

- [app/candidate/documents.tsx](app/candidate/documents.tsx)
- [lib/candidate-documents.ts](lib/candidate-documents.ts)

Le module est solidement structuré pour :

- validation PDF
- upload vers Supabase Storage
- génération de chemins de stockage sécurisés
- lecture du CV principal depuis le profil candidat
- affichage des documents existants
- suppression de documents stockés

En revanche, plusieurs parties sont explicitement laissées en TODO ou non poussées :

- enregistrement métadonnées des documents dans une table candidate_documents
- suppression des lignes DB correspondantes
- certaines opérations restent “désactivées” par commentaire dans le code

Le statut fonctionnel réel est donc “partiel mais bien préparé”.

### 4.9. Profil candidat et données métier

#### Statut : IMPLEMENTÉ

Fichiers principaux :

- [lib/candidate-profile.ts](lib/candidate-profile.ts)
- [lib/profile-completion.ts](lib/profile-completion.ts)

Le module offre :

- récupération du profil courant
- cache local AsyncStorage
- chargement complet des expériences, formations, compétences, langues, préférences
- calcul de complétion du profil
- sauvegarde et mise à jour des infos du candidat

### 4.10. Fiches / guides

#### Statut : IMPLEMENTÉ

Fichiers principaux :

- [app/candidate/(tabs)/fiches.tsx](app/candidate/(tabs)/fiches.tsx)
- [app/candidate/guides.tsx](app/candidate/guides.tsx)
- [app/candidate/guides-usage.tsx](app/candidate/guides-usage.tsx)
- [lib/fiches.ts](lib/fiches.ts)

Le comportement est orienté “guides / fiches pratiques” avec liste et pages liées à des contenus locaux. En l’état, la logique de récupération semble structurée mais la complétude fonctionnelle dépend de la donnée métier réellement alimentée en base.

### 4.11. Paramètres / compte / RGPD / informations légales

#### Statut : IMPLEMENTÉ

Fichier principal : [app/candidate/(tabs)/settings.tsx](app/candidate/(tabs)/settings.tsx)

Le module propose :

- éléments de support
- liens vers WhatsApp, Facebook, LinkedIn, email, téléphone
- documents légaux (mentions légales, CGU, confidentialité)
- préférences (taille du texte, thème)
- déconnexion

## 5. Documentation technique

### 5.1. Base de données et intégration Supabase

Les intégrations observées touchent plusieurs tables métiers :

- candidates
- candidate_experience
- candidate_education
- candidate_skills
- candidate_languages
- candidate_preferences
- job_offers
- candidate_saved_offers
- job_applications
- notifications
- local_guides

La gestion est principalement codée via le client Supabase et le pattern .from(...).select/update/insert.

### 5.2. Hyperliens et redirections

Le routing et les liens externes sont bien présents dans les écrans. L’usage d’expo-linking est visible dans les écrans d’authentification et de paramètres.

### 5.3. Sécurité et access control

Remarques clés :

- La session est stockée via SecureStore.
- Les écrans candidats sont protégés par vérification de session et profil.
- La déconnexion nettoie la session et redirige vers l’authentification.
- Plusieurs fonctions vérifient l’identifiant du candidat courant avant lecture/écriture.

### 5.4. Cache et performance

Le projet applique un cache local sur les données de profil avec AsyncStorage dans [lib/candidate-profile.ts](lib/candidate-profile.ts). Il existe aussi un mécanisme de cache de page pour la liste des offres dans [app/candidate/(tabs)/jobs.tsx](app/candidate/(tabs)/jobs.tsx) via [lib/session-page-cache.ts](lib/session-page-cache.ts).

Cela est positif pour la réactivité, mais il faut surveiller :

- cohérence entre cache local et données distantes
- invalidation lors de modification de profil / documents / offres enregistrées
- éventuels états de synchronisation incohérents

### 5.5. Logs de debug

#### Statut : IMPLEMENTÉ et stabilisé

Le module [lib/debug-duplicate-keys.ts](lib/debug-duplicate-keys.ts) regroupe des fonctions de diagnostic. Il a été conçu pour :

- détecter les doublons de clés dans listes
- tracer les changements d’état
- surveiller l’intégrité des données
- réduire la verbosité brute de la console et ne garder que des logs ciblés

La constante ENABLE_DEBUG_LOGS est principale source de contrôle. Ce point contribue à la stratégie de “logs utiles en cas de bug” demandée dans le contexte de travail.

## 6. Matrice d’état des fonctionnalités

| Domaine | Statut | Observation |
|---|---|---|
| Authentification | IMPLEMENTÉ | Session Supabase + vérification du profil candidat |
| Inscription | IMPLEMENTÉ | Email + validation + création du profil candidat |
| Connexion | IMPLEMENTÉ | Vérification email confirmé + route candidat |
| Dashboard | IMPLEMENTÉ | Complétion, offres, notifications, applications |
| Jobs | IMPLEMENTÉ | Recherche, filtres, pagination, sauvegarde |
| Candidatures | IMPLEMENTÉ | État, historique, navigation |
| Profil candidat | IMPLEMENTÉ | Cache + péremption + complétion |
| Documents CV/PDF | PARTIEL | Upload et stockage fonctionnels, persistance DB partielle |
| Notifications | IMPLEMENTÉ | Lecture / liste / compteur |
| Fiches / guides | IMPLEMENTÉ | Structure fonctionnelle, contenu dépendant de la base |
| Paramètres / legal | IMPLEMENTÉ | La majeure partie est présente |
| Menu drawer | IMPLEMENTÉ | Comportement explicite et stabilisé |
| Side menu web | IMPLEMENTÉ | Conçu pour rester un drawer latéral, pas un écran tab distinct |
| Tests unitaires | PARTIEL | Des tests existent sur profil et docs, mais pas exhaustive |
| Migrations/DB avancées | PRÉVU | Certaines tables de documents et fonctionnalités admin sont mentionnées comme TODO |

## 7. Points forts du produit

- Architecture claire autour du rôle candidat.
- Contrôle d’accès robuste.
- Services de données séparés par responsabilité.
- Expérience mobile orientée “simple, claire, rapide”.
- Gestion des documents et CV adaptée à un usage mobile.
- Navigation cohérente entre dashboard, jobs, saved jobs et applications.

## 8. Risques et axes d’amélioration

### 8.1. Persistance des documents

Le code montre des TODOs explicites dans [lib/candidate-documents.ts](lib/candidate-documents.ts) :

- insertion DB des documents décorrélée du stockage fichier
- commentaires désactivant le chargement réel depuis candidate_documents

Cela limite la robustesse de la gestion documentaire si on veut un archivage propre et exploitable côté application / admin.

### 8.2. Dépendance forte au profil candidat

De nombreux écrans supposent qu’un candidat existe et est valide. Si tel n’est pas le cas :

- la session peut être fermée
- la redirection peut repartir sur /auth
- l’application peut afficher un message d’erreur sans contexte métier complet

### 8.3. Gestion des logs

Même si le module de debug est bien plus propre qu’un console brut, il faut rester prudent :

- éviter les logs trop prolifiques en production
- ne pas exposer de données sensibles ou de session complète
- garder une politique de concentration sur les événements de bug utiles

### 8.4. Couverture de tests

Le projet contient des fichiers de test comme :

- [lib/candidate-profile.test.ts](lib/candidate-profile.test.ts)
- [lib/candidate-documents.test.ts](lib/candidate-documents.test.ts)
- [lib/profile-completion.test.ts](lib/profile-completion.test.ts)
- [lib/jobs-merge-duplicate.test.ts](lib/jobs-merge-duplicate.test.ts)

Ces tests sont utiles, mais l’audit montre que la couverture n’est pas encore globale sur tout le parcours candidat, notamment :

- flux de formulaire
- navigation et redirections
- cas d’erreurs réseau
- documents PDF
- intégration des notifications

## 9. Conclusion

L’application mobile Emploiplus est aujourd’hui une application candidate fonctionnelle et bien organisée, avec une base solide sur les points suivants :

- authentification efficace
- gestion de profil
- recherche d’emploi
- sauvegarde et candidatures
- documents CV
- paramètres et support

Le niveau de maturité est bon pour une application orientée candidat mobile, avec un bon socle technique et un design de navigation cohérent. Les principaux écarts observés concernent surtout des fonctionnalités “partielles” ou encore “prêtes pour migration” liés à la persistance de données métier et à la couverture de tests.

En l’état, l’application est globalement en statut “fonctionnel + extensible”, avec une base durable pour la suite du produit.

## 10. Fichiers clés de référence

- [app/_layout.tsx](app/_layout.tsx)
- [app/candidate/(tabs)/_layout.tsx](app/candidate/(tabs)/_layout.tsx)
- [app/candidate/(tabs)/dashboard.tsx](app/candidate/(tabs)/dashboard.tsx)
- [app/candidate/(tabs)/jobs.tsx](app/candidate/(tabs)/jobs.tsx)
- [app/candidate/(tabs)/settings.tsx](app/candidate/(tabs)/settings.tsx)
- [lib/supabase.ts](lib/supabase.ts)
- [lib/candidate-profile.ts](lib/candidate-profile.ts)
- [lib/jobs.ts](lib/jobs.ts)
- [lib/notifications.ts](lib/notifications.ts)
- [lib/candidate-documents.ts](lib/candidate-documents.ts)
- [lib/debug-duplicate-keys.ts](lib/debug-duplicate-keys.ts)
- [lib/swipe-navigation.ts](lib/swipe-navigation.ts)
