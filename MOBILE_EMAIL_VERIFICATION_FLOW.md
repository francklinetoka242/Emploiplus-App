# MOBILE_EMAIL_VERIFICATION_FLOW.md - Flux d'Inscription Mobile & Code à 6 Chiffres

## 1. Vue d'Ensemble

Le système d'inscription mobile fonctionne selon ce processus:

1. **Utilisateur s'inscrit** via `/auth/signup` avec email + password
2. **Frontend crée l'utilisateur** dans Supabase Auth
3. **Frontend appelle** `POST /functions/v1/send-verification-code` 
4. **Backend génère un code** aléatoire à 6 chiffres (000000-999999)
5. **Stocke le code** dans `email_verification_codes` table (expiration 20 min)
6. **Envoie l'email** via `/api/send-email` (Nodemailer - votre domaine)
7. **Utilisateur entre le code** dans l'app (6 inputs numériques)
8. **Frontend appelle** `POST /functions/v1/verify-code`
9. **Backend valide le code** et marque l'email comme confirmé
10. **Utilisateur peut accéder** à son compte

Le système utilise des **codes aléatoires temporaires** stockés en base de données avec expiration et tentatives limitées.

---

## 2. Architecture

```
┌─────────────────────┐
│  SignupScreen       │
│  (React Native)     │
└──────────┬──────────┘
           │ 1. Creates user in Supabase Auth
           ↓
┌──────────────────────────────┐
│  Supabase Auth               │
│  user_id + email (unconfirmed)
└──────────┬───────────────────┘
           │ 2. Call send-verification-code
           ↓
┌─────────────────────────────────────────┐
│  Supabase Function                      │
│  /functions/v1/send-verification-code   │
└──────────┬────────────────────────────────┘
           │
           ├─→ Generate 6-digit code (000000-999999)
           │   Math.floor(Math.random() * 1000000)
           │
           ├─→ Supabase Database
           │   INSERT INTO email_verification_codes
           │   (email, code, user_id, expires_at, attempts)
           │   Expiration: NOW + 20 minutes
           │   Max attempts: 5
           │
           └─→ Call /api/send-email (Nodemailer)
               POST https://emploiplus-group.com/api/send-email
               {
                 to: email,
                 template: "verification-code",
                 code: "123456",
                 expires_in_minutes: 20
               }

┌─────────────────────────────┐
│  VerifyCodeScreen           │
│  (React Native)             │
│  6 TextInput numériques     │
└──────────┬──────────────────┘
           │ User enters code
           ↓
┌──────────────────────────────┐
│  Frontend                    │
│  POST /functions/v1/verify   │
│  { email, code }             │
└──────────┬───────────────────┘
           │
           ↓
┌──────────────────────────────┐
│  Supabase Function           │
│  /functions/v1/verify-code   │
└──────────┬───────────────────┘
           │
           ├─→ Query email_verification_codes
           │   WHERE email = ? AND code = ?
           │   AND verified_at IS NULL
           │   AND expires_at > NOW
           │
           ├─→ Check attempts (< 5)
           │
           ├─→ IF code matches:
           │   - UPDATE auth.users SET email_confirmed_at = NOW
           │   - UPDATE email_verification_codes SET verified_at = NOW
           │   - Return { success: true }
           │
           └─→ IF code wrong:
               - Increment attempts
               - Return { error, attemptsLeft }

```

**Composants Clés:**
- **Frontend Mobile**: React Native (Expo)
- **Supabase Auth**: Gère les utilisateurs
- **DB Table**: `email_verification_codes` - Stocke les codes temporaires
- **Supabase Functions**: Déno - Logique de génération/vérification
- **Nodemailer**: Envoie les emails avec votre domaine

---

## 3. Configuration Variables d'Environnement

### Supabase (déjà configuré)
```env
# Dans .env ou Supabase dashboard
SUPABASE_URL=https://zhldgrvmmdhtlsnsxuys.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

### Node.js/Vercel (pour /api/send-email)
```env
# SMTP Nodemailer (LWS Panel)
SMTP_HOST=mail55.lwspanel.com
SMTP_PORT=465
SMTP_USER=contact@emploiplus-group.com
SMTP_PASS=aK2!PfQYZkjRbrc
secure=true (port 465 = TLS)

FROM_EMAIL=contact@emploiplus-group.com
FROM_NAME=Emploiplus-Group
SITE_URL=https://emploiplus-group.com
```

### App Mobile (déjà configuré)
```env
EXPO_PUBLIC_SUPABASE_URL=https://zhldgrvmmdhtlsnsxuys.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

---

## 4. Database Table: email_verification_codes

```sql
CREATE TABLE email_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ NULL,
  
  -- Indexes pour lookups rapides
  UNIQUE(email, code)
);

CREATE INDEX idx_email_verification_codes_email ON email_verification_codes(email);
CREATE INDEX idx_email_verification_codes_code ON email_verification_codes(code);
CREATE INDEX idx_email_verification_codes_user_id ON email_verification_codes(user_id);
CREATE INDEX idx_email_verification_codes_expires_at ON email_verification_codes(expires_at);
```

---

## 5. Endpoint Supabase Function: POST /functions/v1/send-verification-code

**Route**: `/functions/v1/send-verification-code`  
**Méthode**: POST  
**Authentification**: Aucune

### Request Payload

```json
{
  "email": "candidat@example.com",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Response - Succès (200)

```json
{
  "success": true,
  "message": "Verification code sent successfully"
}
```

### Response - Erreurs (400/500)

```json
{
  "error": "Email is required"
}
```

### Processus Interne

1. **Générer code** aléatoire 6 chiffres: `Math.floor(100000 + Math.random() * 900000)`
2. **Calculer expiration**: NOW + 20 minutes
3. **Insérer en base**: `INSERT INTO email_verification_codes`
4. **Appeler `/api/send-email`** (Nodemailer)
   ```
   POST https://emploiplus-group.com/api/send-email
   {
     to: "candidat@example.com",
     subject: "Code de vérification EmploiPlus",
     template: "verification-code",
     code: "123456",
     expiresInMinutes: 20
   }
   ```
5. **Retourner succès** (même si email échoue pour permettre renvoi)

---

## 6. Endpoint Supabase Function: POST /functions/v1/verify-code

**Route**: `/functions/v1/verify-code`  
**Méthode**: POST  
**Authentification**: Aucune

### Request Payload

```json
{
  "email": "candidat@example.com",
  "code": "123456",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Response - Succès (200)

```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

### Response - Erreurs

| Code | Erreur | Cause |
|------|--------|-------|
| **400** | `Invalid verification code` | Code ne correspond pas ou n'existe pas |
| **400** | `Code has expired` | Plus de 20 minutes |
| **400** | `Too many attempts` | Plus de 5 tentatives |
| **429** | `Rate limit exceeded` | Trop d'appels trop rapides |

### Processus Interne

1. **Récupérer le code**: Query `email_verification_codes WHERE email = ? AND code = ? AND verified_at IS NULL`
2. **Vérifier expiration**: Si `now() > expires_at` → erreur
3. **Vérifier tentatives**: Si `attempts >= 5` → erreur
4. **Code valide?**
   - OUI: UPDATE `verified_at = NOW()` → retour succès
   - NON: Incrémenter `attempts` → retour erreur + tentatives restantes
5. **Si code valide**: UPDATE `auth.users` SET `email_confirmed_at = NOW()`

---

## 7. Endpoint Supabase Function: POST /functions/v1/resend-verification-code

**Route**: `/functions/v1/resend-verification-code`  
**Méthode**: POST  
**Authentification**: Aucune

### Request Payload

```json
{
  "email": "candidat@example.com"
}
```

### Rate Limiting

- Max 1 renvoi par 60 secondes par email
- Message: "Attendez {N} secondes avant de renvoyer"

### Processus

1. Vérifier code valide récent (< 60 sec)
2. Si oui: Retourner erreur rate limit
3. Si non: Générer nouveau code et envoyer email

---

## 8. Flux Complet d'Inscription Mobile

### Étape 1: Utilisateur Soumet Formulaire de Signup
```
SignupScreen.tsx:
- Prénom, Nom
- Email (validé format)
- Password (min 8 caractères)
- Accepte conditions générales
→ Clique "S'inscrire"
```

### Étape 2: Frontend Crée le Compte
```typescript
const { data: authData, error } = await supabase.auth.signUp({
  email: normalizedEmail,
  password,
  options: {
    data: {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    },
  },
});

// Crée aussi le profil candidat
await supabase.from('candidates').insert({
  user_id: userId,
  first_name: firstName,
  last_name: lastName,
  email: normalizedEmail,
  status: 'active',
});
```

### Étape 3: Frontend Appelle send-verification-code
```typescript
const response = await fetch(
  `${supabaseUrl}/functions/v1/send-verification-code`,
  {
    method: 'POST',
    body: JSON.stringify({ email: normalizedEmail, userId }),
  }
);
```

### Étape 4: Supabase Function Traite la Requête
```
1. Génère code aléatoire: "847291"
2. Insère en DB: expires_at = now() + 20min
3. Appelle /api/send-email (Nodemailer)
4. Retourne succès
```

### Étape 5: Nodemailer Envoie l'Email
```
De: contact@emploiplus-group.com
À: candidat@example.com
Sujet: "Code de vérification EmploiPlus"
Corps: 
  "Votre code: 847291"
  "Ce code expire dans 20 minutes"
```

### Étape 6: Frontend Redirige vers Vérification
```typescript
router.replace({
  pathname: '/auth/verify-code',
  params: { email: normalizedEmail, userId },
});
```

### Étape 7: Utilisateur Entre le Code
```
VerifyCodeScreen.tsx:
- 6 TextInput numériques individuels
- Auto-focus au suivant
- Timer décompte 20 minutes
- Bouton "Vérifier le code"
```

### Étape 8: Frontend Vérifie le Code
```typescript
const response = await fetch(
  `${supabaseUrl}/functions/v1/verify-code`,
  {
    method: 'POST',
    body: JSON.stringify({ 
      email, 
      code: "847291",
      userId 
    }),
  }
);
```

### Étape 9: Supabase Function Valide
```
1. Cherche le code dans la DB
2. Vérifie: not expired, correct code, < 5 attempts
3. Si OK: 
   - Marque verified_at = NOW()
   - Update auth.users email_confirmed_at = NOW()
   - Retourne succès
4. Si erreur: Incrément tentatives, retourne tentatives restantes
```

### Étape 10: Frontend Redirige vers Dashboard
```typescript
if (success) {
  router.replace('/candidate/(tabs)/home');
}
```

---

## 9. Gestion des Erreurs et Rate Limiting

### Erreurs Courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| Code expired | Plus de 20 minutes | Cliquer "Renvoyer le code" |
| Invalid code | Mauvaise saisie | Vérifier la saisie |
| Too many attempts | 5 tentatives échouées | Cliquer "Renvoyer le code" |
| Email send error | Problème Nodemailer | Vérifier vars d'env |

### Rate Limiting

**send-verification-code:**
- Aucun limite (l'utilisateur vient de s'inscrire)

**resend-verification-code:**
- Max 1 par 60 secondes par email
- Max 5 par 24h par email

**verify-code:**
- Max 5 tentatives par code

---

## 10. Code Exemple - Structure Principale

### send-verification-code/index.ts

```typescript
serve(async (req) => {
  const { email, userId } = await req.json();
  
  // 1. Générer code 6 chiffres
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // 2. Calculer expiration (20 min)
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
  
  // 3. Insérer en BD
  await supabase.from('email_verification_codes').insert({
    email, code, user_id: userId, expires_at,
  });
  
  // 4. Appeler /api/send-email
  await fetch('https://www.emploiplus-group.com/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: email,
      subject: 'Code de vérification EmploiPlus',
      template: 'verification-code',
      code, expiresInMinutes: 20,
    }),
  });
  
  return new Response(JSON.stringify({ success: true }));
});
```

### verify-code/index.ts

```typescript
serve(async (req) => {
  const { email, code } = await req.json();
  
  // 1. Récupérer le code en BD
  const { data: record } = await supabase
    .from('email_verification_codes')
    .select('*')
    .eq('email', email)
    .eq('code', code)
    .is('verified_at', null)
    .gt('expires_at', now())
    .single();
  
  if (!record) {
    // Incrémenter tentatives
    await supabase.from('email_verification_codes')
      .update({ attempts: record.attempts + 1 })
      .eq('id', record.id);
    return error('Invalid code', 400);
  }
  
  // 2. Marquer comme vérifié
  await supabase.from('email_verification_codes')
    .update({ verified_at: now() })
    .eq('id', record.id);
  
  // 3. Confirmer email dans auth
  const { error } = await supabase.auth.admin.updateUserById(record.user_id, {
    email_confirm: true,
  });
  
  return success({ message: 'Email verified' });
});
```

---

**Dernière mise à jour**: 18 Août 2026  
**Version**: 1.0 Mobile  
**État**: Prêt pour implémentation ✓
