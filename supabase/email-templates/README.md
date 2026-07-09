# Emails FLUX — configuration manuelle

Les templates HTML de ce dossier sont la source de vérité versionnée des
emails d'authentification Supabase. Les emails transactionnels (commandes)
sont envoyés par le code via Resend (`lib/emails/`).

## 1. Resend — domaine expéditeur

1. Dashboard Resend → **Domains** → *Add domain* → `mail.<domaine-flux>`.
2. Chez le registrar, créer les enregistrements DNS fournis par Resend
   (TXT SPF + CNAME DKIM, MX optionnel pour les bounces).
3. Attendre le statut **Verified** (peut prendre quelques heures).
4. Créer une clé API → `RESEND_API_KEY`.

## 2. Variables d'environnement

Dans `.env.local` **et** Vercel (Production + Preview) :

```
RESEND_API_KEY=re_xxx
EMAIL_FROM=FLUX <no-reply@mail.<domaine-flux>>
```

Sans `EMAIL_FROM`, le code retombe sur `onboarding@resend.dev` (dev
uniquement : n'envoie qu'à l'adresse du compte Resend). Sans
`RESEND_API_KEY`, aucun email n'est envoyé (warning en console).

## 3. Supabase Auth — SMTP via Resend

Supabase dashboard → **Authentication → SMTP Settings** :

| Champ | Valeur |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | clé API Resend (idéalement une clé dédiée SMTP) |
| Sender email | `no-reply@mail.<domaine-flux>` |
| Sender name | `FLUX` |

## 4. Supabase Auth — templates

Supabase dashboard → **Authentication → Email Templates**, coller le HTML :

- *Confirm signup* → `confirmation.html`
- *Magic Link* → `magic-link.html`
- *Reset Password* → `recovery.html`

Les variables `{{ .ConfirmationURL }}` et `{{ .SiteURL }}` sont remplacées
par Supabase à l'envoi.

## 5. Sécurité

- `RESEND_API_KEY` est server-only : jamais de préfixe `NEXT_PUBLIC_`.
- Si une clé fuite (ex. commitée par erreur) : la révoquer immédiatement
  dans le dashboard concerné et en générer une nouvelle.
