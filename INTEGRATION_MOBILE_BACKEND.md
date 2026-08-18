# 🚀 Guide d'Intégration Backend Mobile dans le Site

## 📊 Résumé Architecture

**Site :** React + Vite déployé sur Vercel  
**API Backend :** Handlers Vercel dans `/api/`  
**Auth :** Supabase Auth + logique custom HMAC  
**Email :** Nodemailer + SMTP  
**DB :** Supabase PostgreSQL  

---

## 🎯 Objectif

Intégrer le backend mobile (Express) dans le site Vercel existant, en convertissant les handlers Express en handlers Vercel serverless.

**Résultat attendu :**
```
https://www.emploiplus-group.com/api/mobile-register     ← Inscription mobile
https://www.emploiplus-group.com/api/mobile-confirm      ← Confirmation
https://www.emploiplus-group.com/api/mobile-resend       ← Renvoi de code
https://www.emploiplus-group.com/api/mobile-forgot       ← Mot de passe oublié
https://www.emploiplus-group.com/api/mobile-reset        ← Reset password
```

---

## 📋 Étapes d'Intégration

### ✅ ÉTAPE 1 : Préparer les fichiers mobiles

**Où :** Dans le repo du **site web**  
**Dossier :** `api/`

Crée les 5 fichiers suivants dans le site (dossier `api/`).

#### **Fichier 1: `api/mobile-register.ts`**

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Configuration
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const smtpHost = process.env.SMTP_HOST!;
const smtpPort = parseInt(process.env.SMTP_PORT!);
const smtpUser = process.env.SMTP_USER!;
const smtpPass = process.env.SMTP_PASS!;
const jwtSecret = process.env.EMAIL_SIGNING_SECRET!;
const deepLinkUrl = process.env.DEEP_LINK_URL || 'emploiplus://verify';
const siteUrl = process.env.SITE_URL || 'https://www.emploiplus-group.com';

const supabase = createClient(supabaseUrl, supabaseKey);

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

// Générer token HMAC
function createHMACToken(email: string, userId: string, secret: string): string {
  const payload = JSON.stringify({ email, userId, iat: Date.now() });
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${hmac}`;
}

// Générer code 6 chiffres
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // 1. Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { first_name: firstName, last_name: lastName },
    });

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message || 'Failed to create user' });
    }

    const userId = authData.user.id;

    // 2. Générer code de vérification
    const code = generateVerificationCode();
    const token = createHMACToken(email, userId, jwtSecret);
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes

    // 3. Stocker le code en base
    const { error: codeError } = await supabase
      .from('email_verification_codes')
      .insert([
        {
          email,
          code,
          user_id: userId,
          expires_at: expiresAt.toISOString(),
          verified_at: null,
          attempts: 0,
          max_attempts: 5,
        },
      ]);

    if (codeError) {
      return res.status(500).json({ error: 'Failed to store verification code' });
    }

    // 4. Créer lien de confirmation avec token
    const deepLink = `${deepLinkUrl}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}&userId=${encodeURIComponent(userId)}`;

    // 5. Envoyer l'email
    const mailContent = `
      <h2>Bienvenue sur Emploiplus!</h2>
      <p>Votre code de vérification : <strong>${code}</strong></p>
      <p>Ou cliquez ici pour confirmer : <a href="${deepLink}">Confirmer automatiquement</a></p>
      <p>Ce code expire dans 20 minutes.</p>
    `;

    await transporter.sendMail({
      from: `${process.env.FROM_NAME || 'Emploiplus'} <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: 'Code de vérification Emploiplus',
      html: mailContent,
    });

    res.status(200).json({
      success: true,
      userId,
      email,
      message: 'User registered. Check your email for verification code.',
    });
  } catch (error: any) {
    console.error('Mobile register error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
```

---

#### **Fichier 2: `api/mobile-confirm.ts`**

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const jwtSecret = process.env.EMAIL_SIGNING_SECRET!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Valider token HMAC
function verifyHMACToken(token: string, secret: string): { email: string; userId: string } | null {
  try {
    const [payload, signature] = token.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64url');
    if (hmac === signature) {
      return decoded;
    }
  } catch (e) {
    console.error('Token verification error:', e);
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, email, userId } = req.body;

    if (!token || !email || !userId) {
      return res.status(400).json({ error: 'Token, email, and userId required' });
    }

    // 1. Valider le token HMAC
    const decoded = verifyHMACToken(token, jwtSecret);
    if (!decoded || decoded.email !== email || decoded.userId !== userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // 2. Marquer l'email comme confirmé dans Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (updateError) {
      return res.status(500).json({ error: 'Failed to confirm email' });
    }

    // 3. Mettre à jour la table de vérification
    await supabase
      .from('email_verification_codes')
      .update({ verified_at: new Date().toISOString() })
      .eq('email', email)
      .eq('user_id', userId);

    res.status(200).json({
      success: true,
      message: 'Email confirmed successfully',
    });
  } catch (error: any) {
    console.error('Mobile confirm error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
```

---

#### **Fichier 3: `api/mobile-resend.ts`**

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const smtpHost = process.env.SMTP_HOST!;
const smtpPort = parseInt(process.env.SMTP_PORT!);
const smtpUser = process.env.SMTP_USER!;
const smtpPass = process.env.SMTP_PASS!;
const jwtSecret = process.env.EMAIL_SIGNING_SECRET!;
const deepLinkUrl = process.env.DEEP_LINK_URL || 'emploiplus://verify';

const supabase = createClient(supabaseUrl, supabaseKey);

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

function createHMACToken(email: string, userId: string, secret: string): string {
  const payload = JSON.stringify({ email, userId, iat: Date.now() });
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${hmac}`;
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, userId } = req.body;

    if (!email || !userId) {
      return res.status(400).json({ error: 'Email and userId required' });
    }

    // 1. Générer nouveau code
    const code = generateVerificationCode();
    const token = createHMACToken(email, userId, jwtSecret);
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

    // 2. Mettre à jour ou créer l'enregistrement
    const { error: upsertError } = await supabase
      .from('email_verification_codes')
      .upsert([
        {
          email,
          user_id: userId,
          code,
          expires_at: expiresAt.toISOString(),
          verified_at: null,
          attempts: 0,
          max_attempts: 5,
        },
      ], { onConflict: 'email' });

    if (upsertError) {
      return res.status(500).json({ error: 'Failed to resend code' });
    }

    // 3. Envoyer l'email
    const deepLink = `${deepLinkUrl}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}&userId=${encodeURIComponent(userId)}`;
    const mailContent = `
      <h2>Nouveau code de vérification</h2>
      <p>Votre code : <strong>${code}</strong></p>
      <p>Ou <a href="${deepLink}">cliquez ici</a> pour confirmer automatiquement.</p>
      <p>Valide 20 minutes.</p>
    `;

    await transporter.sendMail({
      from: `${process.env.FROM_NAME || 'Emploiplus'} <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: 'Nouveau code Emploiplus',
      html: mailContent,
    });

    res.status(200).json({ success: true, message: 'Code resent' });
  } catch (error: any) {
    console.error('Mobile resend error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
```

---

#### **Fichier 4: `api/mobile-forgot.ts`**

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const smtpHost = process.env.SMTP_HOST!;
const smtpPort = parseInt(process.env.SMTP_PORT!);
const smtpUser = process.env.SMTP_USER!;
const smtpPass = process.env.SMTP_PASS!;
const jwtSecret = process.env.EMAIL_SIGNING_SECRET!;
const deepLinkUrl = process.env.DEEP_LINK_URL || 'emploiplus://reset';

const supabase = createClient(supabaseUrl, supabaseKey);

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

function createHMACToken(email: string, userId: string, secret: string): string {
  const payload = JSON.stringify({ email, userId, iat: Date.now() });
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${hmac}`;
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // 1. Vérifier que l'utilisateur existe
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    const user = userData?.users.find((u: any) => u.email === email);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. Générer code et token
    const code = generateVerificationCode();
    const token = createHMACToken(email, user.id, jwtSecret);
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

    // 3. Sauvegarder le code
    await supabase
      .from('email_verification_codes')
      .upsert([
        {
          email,
          user_id: user.id,
          code,
          expires_at: expiresAt.toISOString(),
          verified_at: null,
          attempts: 0,
          max_attempts: 5,
        },
      ], { onConflict: 'email' });

    // 4. Envoyer l'email avec lien de reset
    const deepLink = `${deepLinkUrl}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}&userId=${encodeURIComponent(user.id)}`;
    const mailContent = `
      <h2>Réinitialisation de mot de passe</h2>
      <p>Code : <strong>${code}</strong></p>
      <p>Ou <a href="${deepLink}">cliquez ici</a> pour réinitialiser directement.</p>
      <p>Valide 20 minutes.</p>
    `;

    await transporter.sendMail({
      from: `${process.env.FROM_NAME || 'Emploiplus'} <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: 'Réinitialisation mot de passe',
      html: mailContent,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset email sent',
      userId: user.id,
    });
  } catch (error: any) {
    console.error('Mobile forgot error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
```

---

#### **Fichier 5: `api/mobile-reset.ts`**

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const jwtSecret = process.env.EMAIL_SIGNING_SECRET!;

const supabase = createClient(supabaseUrl, supabaseKey);

function verifyHMACToken(token: string, secret: string): { email: string; userId: string } | null {
  try {
    const [payload, signature] = token.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64url');
    if (hmac === signature) {
      return decoded;
    }
  } catch (e) {
    console.error('Token verification error:', e);
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, email, userId, newPassword } = req.body;

    if (!token || !email || !userId || !newPassword) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // 1. Valider le token
    const decoded = verifyHMACToken(token, jwtSecret);
    if (!decoded || decoded.email !== email || decoded.userId !== userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // 2. Mettre à jour le password
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) {
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    // 3. Marquer comme utilisé
    await supabase
      .from('email_verification_codes')
      .update({ verified_at: new Date().toISOString() })
      .eq('email', email)
      .eq('user_id', userId);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error: any) {
    console.error('Mobile reset error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
```

---

### ✅ ÉTAPE 2 : Ajouter les dépendances

**Où :** Dans le **site**, fichier `package.json`

Vérifie que ces dépendances existent, sinon ajoute-les :

```bash
npm install nodemailer @supabase/supabase-js crypto
npm install --save-dev @types/nodemailer
```

---

### ✅ ÉTAPE 3 : Variables d'environnement

**Où :** Vercel Dashboard → Projet site → Settings → Environment Variables

Ajoute ou vérifie ces variables (même valeurs que le site) :

```
SUPABASE_URL                  → https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY     → (clé service role Supabase)
SMTP_HOST                     → smtp.example.com
SMTP_PORT                     → 587
SMTP_USER                     → user@example.com
SMTP_PASS                     → password
FROM_EMAIL                    → no-reply@emploiplus-group.com
FROM_NAME                     → Emploiplus
EMAIL_SIGNING_SECRET          → (token secret, même que site)
DEEP_LINK_URL                 → emploiplus://verify
SITE_URL                      → https://www.emploiplus-group.com
```

---

### ✅ ÉTAPE 4 : Mettre à jour `vercel.json`

**Où :** Site, fichier `vercel.json` (racine)

**Remplace :**
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/send-email",
      "destination": "/api/send-email"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Par :**
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/api/mobile-:path*",
      "destination": "/api/mobile-:path*"
    },
    {
      "source": "/send-email",
      "destination": "/api/send-email"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/api/mobile-:path*",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "POST, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type"
        }
      ]
    }
  ]
}
```

---

### ✅ ÉTAPE 5 : Modifier l'app mobile

**Où :** App mobile, fichier [app/auth/signup.tsx](app/auth/signup.tsx)

Remplace l'URL Supabase par l'URL du site :

**Avant :**
```typescript
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const response = await fetch(`${supabaseUrl}/functions/v1/send-verification-code`, {
```

**Après :**
```typescript
const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://www.emploiplus-group.com';
const response = await fetch(`${apiBaseUrl}/api/mobile-register`, {
```

---

**Où :** App mobile, fichier [app/auth/verify-code.tsx](app/auth/verify-code.tsx)

Remplace les 3 appels Supabase :

**Avant :**
```typescript
const confirmResponse = await fetch(`${supabaseUrl}/functions/v1/mobile-confirm`, {
const resendResponse = await fetch(`${supabaseUrl}/functions/v1/mobile-resend`, {
```

**Après :**
```typescript
const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://www.emploiplus-group.com';
const confirmResponse = await fetch(`${apiBaseUrl}/api/mobile-confirm`, {
const resendResponse = await fetch(`${apiBaseUrl}/api/mobile-resend`, {
```

---

### ✅ ÉTAPE 6 : Déployer

1. **Push les fichiers au site :**
   ```bash
   cd site-repo/
   git add api/mobile-*.ts vercel.json package.json
   git commit -m "Add mobile backend API routes"
   git push origin main
   ```

2. **Vercel déploie automatiquement**

3. **Test local (optionnel) :**
   ```bash
   npm run dev
   # Va sur http://localhost:3000/api/mobile-register
   ```

---

## 🧪 Tester l'intégration

### Test 1 : Inscription mobile

```bash
curl -X POST https://www.emploiplus-group.com/api/mobile-register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Réponse attendue :**
```json
{
  "success": true,
  "userId": "uuid-here",
  "email": "test@example.com",
  "message": "User registered. Check your email for verification code."
}
```

### Test 2 : Confirmer email (via token)

```bash
curl -X POST https://www.emploiplus-group.com/api/mobile-confirm \
  -H "Content-Type: application/json" \
  -d '{
    "token": "token-from-email",
    "email": "test@example.com",
    "userId": "uuid-from-response"
  }'
```

---

## 📌 Résumé des changements

| Étape | Fichiers | Action |
|-------|----------|--------|
| 1 | `api/mobile-*.ts` (5 fichiers) | ✅ Créer dans le site |
| 2 | `package.json` | ✅ Ajouter dépendances |
| 3 | Vercel Dashboard | ✅ Ajouter env variables |
| 4 | `vercel.json` | ✅ Mettre à jour rewrites |
| 5 | `app/auth/signup.tsx` | ✅ Changer l'URL API |
| 5 | `app/auth/verify-code.tsx` | ✅ Changer les 3 URLs API |
| 6 | Git | ✅ Push et déployer |

---

## ✅ Résultat

Après intégration :
- ✅ Backend mobile intégré au site Vercel
- ✅ Même DB Supabase
- ✅ Même variables d'env
- ✅ Routes avec "mobile" dans le nom
- ✅ Deep links fonctionnels
- ✅ Email de confirmation envoyés
- ✅ App mobile appelle le bon endpoint

**C'est fait ! 🎉**
