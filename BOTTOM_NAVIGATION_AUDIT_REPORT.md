# CORRECTION BOTTOM NAVIGATION

## Cause exacte
La cause réelle était la configuration du layout Tabs dans [emploiplus-react-native/app/candidate/_layout.tsx](emploiplus-react-native/app/candidate/_layout.tsx) : la barre n’était pas explicitement verrouillée sur seulement 5 écrans. Expo Router peut exposer des routes du dossier candidate comme écrans de tab si elles ne sont pas masquées explicitement. C’est pourquoi les routes secondaires comme /candidate/profile et /candidate/applications pouvaient rester visibles dans un runtime plus ancien ou un bundle non rafraîchi, malgré le code source apparent.

Les routes secondaires ne sont pas supprimées ; elles restent fonctionnelles :
- [emploiplus-react-native/app/candidate/profile/index.tsx](emploiplus-react-native/app/candidate/profile/index.tsx)
- [emploiplus-react-native/app/candidate/applications/index.tsx](emploiplus-react-native/app/candidate/applications/index.tsx)

---

## Correction
Fichier modifié :
- [emploiplus-react-native/app/candidate/_layout.tsx](emploiplus-react-native/app/candidate/_layout.tsx)

Résumé :
- les 5 tabs officiels ont été explicitement configurés avec `href`
- les écrans secondaires `profile` et `applications` ont été exclus de la TabBar avec `href: null` et `tabBarButton: () => null`
- les routes restent accessibles par `router.push(...)` sans être rendues comme boutons de navigation

---

## Navigation finale
La Bottom Navigation est désormais explicitement limitée à :

1. Menu → /candidate/menu
2. Tableau de bord → /candidate/dashboard
3. Emplois → /candidate/jobs
4. Fiches → /candidate/fiches
5. Paramètres → /candidate/settings

---

## Routes conservées
Les routes suivantes restent fonctionnelles et ne sont plus affichées comme tabs :

- /candidate/profile
- /candidate/applications

Elles restent accessibles depuis :
- [emploiplus-react-native/app/candidate/settings.tsx](emploiplus-react-native/app/candidate/settings.tsx)
- [emploiplus-react-native/app/candidate/jobs/[id]/apply.tsx](emploiplus-react-native/app/candidate/jobs/[id]/apply.tsx)
- [emploiplus-react-native/app/candidate/jobs/confirmation.tsx](emploiplus-react-native/app/candidate/jobs/confirmation.tsx)

---

## Validation
- TypeScript : PASS
  - Commande exécutée : `npx tsc --noEmit`
  - Résultat : aucune sortie, compilation OK
- Navigation : PASS au niveau de la configuration
- Runtime réel : NON VALIDÉ visuellement
  - Je n’ai pas d’émulateur / appareil réel disponible dans cette session pour confirmer le rendu visuel sur le device

> Le correctif est bien appliqué dans la config Expo Router, mais la validation visuelle réelle de la Bottom Navigation sur mobile reste à confirmer dans un émulateur ou un appareil.
