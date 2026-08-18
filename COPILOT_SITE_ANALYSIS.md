# 🤖 Prompt Copilot - Analyse du Site

Copie ce texte dans le chat Copilot de ton workspace du SITE (pas l'app mobile).

---

## Prompt à utiliser dans le workspace du site :

```
Analyse la structure de ce projet et réponds aux questions suivantes dans un fichier SITE_ARCHITECTURE.md :

1. **Type de Framework**
   - Quel framework est utilisé ? (Next.js, React, Vue, etc.)
   - Quelle version ?
   - Avec quel système de déploiement ? (Pages, App Router, etc.)

2. **Structure des API Backend**
   - Où sont les fichiers API ? (pages/api/, app/api/, src/api/, etc.)
   - Donne un exemple d'une route existante
   - Comment sont-elles structurées ? (Express-like, Next.js API routes, etc.)

3. **Système d'Authentification Actuel**
   - Comment fonctionne l'inscription actuelle ?
   - Où se trouve le code d'inscription ? (chemin complet)
   - Comment sont validés les emails ?
   - Est-ce Supabase Auth ou custom ?

4. **Configuration Vercel**
   - Existe-t-il un fichier vercel.json ? Si oui, montre-le
   - Où sont configurées les variables d'env ?
   - Quels sont les secrets configurés ?

5. **Base de Données**
   - Supabase ? PostgreSQL ? Autre ?
   - Où sont les migrations ? (supabase/migrations/, etc.)
   - Quel est le schéma des utilisateurs ?

6. **Email & Notifications**
   - Comment sont envoyés les emails ? (Supabase, Nodemailer, SendGrid, etc.)
   - Où est le code d'envoi d'email ?

7. **Fichier vercel.json existant**
   - Montre-le en entier

Génère un fichier SITE_ARCHITECTURE.md avec toutes les réponses.
```

---

## ✅ Comment utiliser ce prompt :

1. **Va dans ton workspace du site** (repo site sur GitHub)
2. Ouvre le chat Copilot (Ctrl+Shift+I)
3. Copie-colle le prompt ci-dessus
4. Appuie sur **Enter** et laisse Copilot analyser
5. Attends la réponse dans `SITE_ARCHITECTURE.md`

---

## 📝 Après avoir le fichier SITE_ARCHITECTURE.md

Partage-moi le contenu ici, et je te donnerai :
- ✅ Les étapes exactes d'intégration
- ✅ Les fichiers à créer/modifier
- ✅ Les variables d'env à ajouter
- ✅ Comment pointer l'app mobile vers le bon endpoint
