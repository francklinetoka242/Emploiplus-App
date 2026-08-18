# 📧 Système d'Inscription avec Code à 6 Chiffres - Documentation d'Implémentation

## Vue d'ensemble

Le système d'inscription pour l'application mobile a été modifié pour utiliser un **code de vérification à 6 chiffres** envoyé par email au lieu d'un lien de redirection. Cette approche améliore l'UX mobile et la sécurité.

---

## Fichiers Créés/Modifiés

### 1. **Migration SQL** 
📁 `supabase/migrations/20260818_create_email_verification_codes.sql`

**Description :** Crée la table `email_verification_codes` pour stocker temporairement les codes de vérification.

**Table Structure:**
```sql
email_verification_codes (
  id: UUID (clé primaire)
  email: TEXT (email de l'utilisateur)
  code: TEXT (6 chiffres aléatoires)
  attempts: INT (tentatives échouées)
  max_attempts: INT (5 tentatives max)
  created_at: TIMESTAMPTZ
  expires_at: TIMESTAMPTZ (20 minutes)
  verified_at: TIMESTAMPTZ (NULL jusqu'à vérification)
  user_id: UUID (reference auth.users)
)
```

**Actions :**
- ✅ Exécuter la migration Supabase
- ✅ Créer les indexes pour les lookups rapides

### 2. **Fonctions Supabase**

#### 📌 `send-verification-code` 
📁 `supabase/functions/send-verification-code/index.ts`

**Rôle :** Génère un code à 6 chiffres et l'envoie par email

**Paramètres de requête :**
```json
{
  "email": "utilisateur@example.com",
  "userId": "uuid-de-lutilisateur" // optionnel
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "code": "123456" // Seulement en développement
}
```

**Comportement :**
- Génère un code aléatoire de 6 chiffres
- Expire après 20 minutes
- Envoie un email HTML formaté
- Stocke le code en base de données

---

#### 📌 `verify-code`
📁 `supabase/functions/verify-code/index.ts`

**Rôle :** Vérifie le code saisi par l'utilisateur

**Paramètres de requête :**
```json
{
  "email": "utilisateur@example.com",
  "code": "123456",
  "userId": "uuid-de-lutilisateur" // optionnel
}
```

**Réponse (Succès) :**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

**Réponse (Échec) :**
```json
{
  "error": "Invalid verification code",
  "attemptsRemaining": 2
}
```

**Comportement :**
- Valide le code vs base de données
- Vérifie l'expiration (20 minutes)
- Limite les tentatives (5 max)
- Confirme l'email dans Supabase Auth si userId fourni
- Marque le code comme `verified_at`

---

#### 📌 `resend-verification-code`
📁 `supabase/functions/resend-verification-code/index.ts`

**Rôle :** Renvoie un nouveau code si l'utilisateur n'a pas reçu le premier

**Paramètres de requête :**
```json
{
  "email": "utilisateur@example.com",
  "userId": "uuid-de-lutilisateur" // optionnel
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Verification code resent successfully"
}
```

**Protection contre les abus :**
- Empêche les renvois si un code valide existe depuis < 1 minute
- Supprime les anciens codes non vérifiés
- Rate limiting: 429 Too Many Requests

---

### 3. **Écran de Vérification du Code**
📁 `app/auth/verify-code.tsx`

**Fonctionnalités :**
- ✅ 6 champs de saisie pour 6 chiffres
- ✅ Auto-focus entre les champs
- ✅ Retour arrière automatique
- ✅ Minuteur d'expiration du code (20 minutes)
- ✅ Affichage des tentatives restantes
- ✅ Bouton "Renvoyer un code"
- ✅ Gestion des erreurs avec messages détaillés

**Comportement :**
```
1. Utilisateur remplit le formulaire d'inscription
   ↓
2. Clique sur "S'inscrire"
   ↓
3. Création du compte Supabase Auth
   ↓
4. Création du profil candidat
   ↓
5. Envoi du code par email (fonction send-verification-code)
   ↓
6. Redirection vers /auth/verify-code avec email & userId
   ↓
7. Utilisateur saisit les 6 chiffres
   ↓
8. Soumission du code (fonction verify-code)
   ↓
9. Succès → Redirection vers /auth/login
```

---

### 4. **Formulaire d'Inscription Modifié**
📁 `app/auth/signup.tsx`

**Modifications :**
- ✅ Suppression du `emailRedirectTo` (pas de lien de confirmation)
- ✅ Création directe du compte sans confirmation automatique
- ✅ Appel de la fonction `send-verification-code`
- ✅ Redirection vers `/auth/verify-code` avec paramètres

**Nouveau flux :**
```typescript
try {
  // 1. Créer l'utilisateur
  const { data: authData } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: undefined, data: {...} }
  });
  
  // 2. Créer le profil candidat
  await supabase.from('candidates').insert({...});
  
  // 3. Envoyer le code
  await fetch(`${supabaseUrl}/functions/v1/send-verification-code`, {
    body: JSON.stringify({ email, userId })
  });
  
  // 4. Rediriger vers vérification du code
  router.replace({
    pathname: '/auth/verify-code',
    params: { email, userId }
  });
}
```

---

## 🚀 Instructions de Déploiement

### Étape 1 : Appliquer la Migration SQL
```bash
# Via Supabase CLI
supabase migration up

# OU manuellement dans Supabase Dashboard
# SQL Editor → Copier/coller le contenu du fichier .sql → Execute
```

### Étape 2 : Déployer les Fonctions Supabase
```bash
# Via Supabase CLI
supabase functions deploy send-verification-code
supabase functions deploy verify-code
supabase functions deploy resend-verification-code
```

### Étape 3 : Vérifier les Variables d'Environnement
```bash
# Le fichier .env doit contenir :
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Étape 4 : Tester le Flux
1. Ouvrir l'app mobile
2. Aller à `/auth/signup`
3. Remplir le formulaire
4. Cliquer "S'inscrire"
5. Recevoir le code par email
6. Saisir le code dans `/auth/verify-code`
7. Succès → Redirection vers login

---

## 📋 Checklist Finale

- [ ] Migration SQL exécutée dans Supabase
- [ ] 3 fonctions Supabase déployées
- [ ] `signup.tsx` modifié et testé
- [ ] `verify-code.tsx` créé et testé
- [ ] Paramètres d'environnement configurés
- [ ] Test du flux complet (inscription → vérification → login)
- [ ] Test du renvoi de code (resend)
- [ ] Test avec code expiré
- [ ] Test avec code invalide
- [ ] Vérification de l'email dans Supabase Auth après vérification

---

## 🔒 Sécurité

| Aspect | Mesure |
|--------|--------|
| **Stockage du code** | Stocké en base, expiration 20 min |
| **Tentatives** | Max 5 tentatives avant blocage |
| **Rate limiting** | Renvoi min. 1 minute entre les codes |
| **Email confirmation** | Confirmé dans Supabase Auth après vérification |
| **Service role** | Utilise clé service pour opérations sensibles |

---

## ⚠️ Notes Importantes

1. **Email transactionnel :**
   - Les fonctions Supabase utilisent l'email configuré dans le projet Supabase
   - Vérifier que le SMTP/email est configuré

2. **Code en development :**
   - Le code est retourné en réponse API (à enlever en production !)
   - Voir `send-verification-code/index.ts` ligne 72 pour le retirer

3. **Confirmation auto :**
   - Après vérification du code, l'email est automatiquement confirmé dans Supabase Auth
   - Aucun besoin d'action supplémentaire

4. **Utilisateur non confirmé :**
   - L'utilisateur ne peut se connecter qu'après confirmation du code
   - Supabase Auth refusera la connexion si `email_confirmed_at` est NULL

---

## 🧪 Tests Recommandés

### Test Happy Path
```
1. Signup valide
2. Email reçu
3. Code saisi correctement
4. Login fonctionne
```

### Test Code Expiré
```
1. Signup
2. Attendre > 20 minutes
3. Tenter de vérifier
4. Message "Code expiré"
```

### Test Code Invalide
```
1. Signup
2. Saisir code faux
3. Vérifier le message d'erreur
4. Vérifier les tentatives restantes
```

### Test Renvoi
```
1. Signup
2. Ne pas saisir le code
3. Cliquer "Renvoyer un code"
4. Recevoir un nouveau code
5. Vérifier avec le nouveau code
```

---

## ❓ Troubleshooting

| Problème | Solution |
|----------|----------|
| Email non reçu | Vérifier config SMTP Supabase |
| Fonction timeout | Vérifier connexion à la BD |
| Code toujours expiré | Vérifier l'heure du serveur |
| 429 Too Many Requests | Attendre 1 minute avant renvoi |
| Email_confirmed_at reste NULL | Vérifier que verify-code est appelé |

---

## 📞 Support

En cas de problème :
1. Vérifier les logs Supabase Functions (Dashboard → Functions → Logs)
2. Vérifier la table `email_verification_codes`
3. Vérifier que l'utilisateur a bien `email_confirmed_at` après vérification
