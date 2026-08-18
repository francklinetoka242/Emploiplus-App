# Architecture du site

## 1) Type de framework

Le projet est un site front-end React + Vite, avec des routes SPA gérées par `react-router-dom`.

- Framework principal : React 19
- Outil de build : Vite 8
- Déploiement : statique/Vercel + API routes serverless (Vercel)
- Version Node déclarée : 24.x
- Script principal : `vite dev` / `vite build`

Fichiers clés :

- `package.json`
- `vite.config.ts`
- `index.html`
- `src/App.tsx`

Le projet ne semble pas être un Next.js. Il s’agit d’une app React avec un build Vite, pas d’un App Router ou Pages Router Next.js.

---

## 2) Structure des API backend

Les API backend sont dans le dossier racine `api/`.

Exemples observés :

- `api/register.ts`
- `api/send-email.ts`
- `api/confirm.ts`
- `api/resend-confirmation.ts`
- `api/password-reset-request.ts`
- `api/password-reset-confirm.ts`

Ces fichiers utilisent le runtime Vercel (`@vercel/node`) et exportent un handler au format :

```ts
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // logique HTTP
}
```

Exemple réel :

```ts
api/register.ts
```

La structure est donc de type API serverless Vercel, proche d’un pattern Node/Express-like sans Express installé pour ces endpoints, mais avec des handlers HTTP standardisés.

Le `vercel.json` confirme le routage de certaines URLs vers les API :

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

---

## 3) Système d’authentification actuel

### 3.1 Inscription actuelle

L’inscription actuelle est surtout basée sur Supabase Auth, même si le projet enrichit la logique métier avec des endpoints personnalisés.

Chemin principal :

- `src/features/authentication/api/authApi.ts`
- `src/pages/candidate/CandidateSignupPage.tsx`
- `api/register.ts`

Dans `src/features/authentication/api/authApi.ts`, l’inscription est faite via :

```ts
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: options?.redirectTo,
    data: options?.data,
  },
});
```

Ceci confirme que la création du compte principal est gérée par Supabase Auth.

### 3.2 Où se trouve le code d’inscription ?

Chemins concrets :

- `src/features/authentication/api/authApi.ts`
- `src/pages/candidate/CandidateSignupPage.tsx`
- `api/register.ts`

Le fichier `api/register.ts` est important car il fait un appel admin vers Supabase pour créer l’utilisateur directement via l’API admin Supabase :

```ts
fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  },
  body: JSON.stringify({
    email,
    password,
    user_metadata: { first_name: firstName, last_name: lastName },
  }),
});
```

### 3.3 Validation des emails

Le flux de validation d’email est hybride :

- Supabase Auth est utilisé pour gérer la confirmation de compte et les sessions
- un endpoint custom crée aussi un token signé pour la confirmation du compte candidat

Dans `api/register.ts`, le backend génère un token HMAC :

```ts
const tokenPayload = {
  sub: userId,
  email,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
};
```

puis le construit en lien de confirmation :

```ts
const confirmLink = `${confirmationBaseUrl}/api/confirm?token=${encodeURIComponent(token)}`;
```

Il envoie ensuite un email Nodemailer avec ce lien.

### 3.4 Supabase Auth ou custom ?

Réponse : le système actuel est un mélange des deux.

- Authentification principale : Supabase Auth
- Validation email / données métier / confirmation custom : logique backend sur mesure
- Profil candidat et données métier : ajoutés dans des tables PostgreSQL/Supabase

Le projet n’est donc pas “100% custom auth”. C’est une architecture hybride.

---

## 4) Configuration Vercel

### 4.1 Fichier vercel.json

Le fichier existant est :

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

### 4.2 Où sont configurées les variables d’environnement ?

Dans Vercel Project Settings → Environment Variables, et aussi dans le code via `process.env.*` / `import.meta.env.*`.

Exemples observés dans les fichiers :

- `api/register.ts` : `process.env.SUPABASE_URL`, `process.env.SUPABASE_SERVICE_ROLE_KEY`, `process.env.SMTP_HOST`, etc.
- `src/integrations/supabase/client.ts` : `import.meta.env.VITE_SUPABASE_URL`, `import.meta.env.VITE_SUPABASE_ANON_KEY`

### 4.3 Secrets configurés

Le code montre des variables critiques comme :

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `FROM_EMAIL`
- `FROM_NAME`
- `EMAIL_SIGNING_SECRET`
- `SITE_URL`

En pratique, ce sont les secrets / paramètres que Vercel doit recevoir pour le build et les endpoints serveur.

---

## 5) Base de données

### 5.1 Type de base

Le projet utilise Supabase, donc la couche de base de données est PostgreSQL via Supabase.

On le voit notamment avec :

- `src/integrations/supabase/client.ts`
- `api/register.ts` utilisant `/auth/v1/admin/users`
- tables dans `supabase/migrations/`

### 5.2 Migrations

Le dossier de migrations est :

- `supabase/migrations/`

Exemple :

- `supabase/migrations/20260818_create_email_verification_codes.sql`

Ce fichier crée une table dédiée :

```sql
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
```

### 5.3 Schéma utilisateur

Le schéma de l’utilisateur principal est géré dans Supabase Auth (`auth.users`), puis enrichi côté métier dans les tables de données application, notamment `public.candidates`.

Exemple observé dans `api/register.ts` :

```ts
body: JSON.stringify([
  {
    user_id: userId,
    first_name: firstName,
    last_name: lastName,
    email,
    status: "active",
  },
]);
```

Donc le schéma utilisateur est bien split en :

- identité Auth : `auth.users`
- profil métier : `public.candidates`

---

## 6) Email & notifications

### 6.1 Comment les emails sont envoyés

Les emails sont envoyés via Nodemailer avec SMTP.

Le code est dans :

- `api/send-email.ts`
- `api/register.ts`
- `api/password-reset-request.ts`

Exemple de transport Nodemailer :

```ts
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});
```

### 6.2 Quel service/provider

Il n’y a pas de Resend/SendGrid dans le code observé. Le système est basé sur un provider SMTP standard, via les variables d’environnement `SMTP_*`.

### 6.3 Quand les emails sont envoyés

Immédiatement, au moment d’un événement :

- inscription → confirmation
- reset password → lien de réinitialisation
- candidature / envoi custom → `/api/send-email`

Aucune file d’attente durable (Redis/BullMQ/RabbitMQ) n’est visible dans le dépôt analysé.

---

## 7) Fichier vercel.json existant (complet)

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

---

## Conclusion

Le site est un projet React + Vite déployé sur Vercel, avec des API serverless dans le dossier `api/` et une authentification hybride autour de Supabase Auth. La base de données est PostgreSQL via Supabase, les migrations sont dans `supabase/migrations/`, et les emails utilisent Nodemailer via SMTP.

Le périmètre global est cohérent et fonctionnel pour un site Vercel/Supabase, mais il n’est pas encore complètement “indépendant” de Supabase au niveau authentification/gestion de session.
