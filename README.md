# Wayne Web Flux

Vitrines en ligne générées par l'IA pour tous les commerçants à petit budget :
page pro avec prestations, **réservation en ligne**, agenda + mini-CRM, et
outils de contenu IA limités par un **système de crédits** (anti-abus).

Généralisé multi-métiers, au thème Wayne Web.

## Stack

- **Next.js 16** (App Router, SSR pour le SEO local des vitrines `/p/[slug]`)
- **Supabase** (Auth, Postgres + RLS, Storage) — projet dédié, ne pas réutiliser celui de wayne-web-site
- **Claude API** (`claude-sonnet-5`, streaming) pour la génération de contenu
- **Tailwind v4 + shadcn/ui**, thème noir + rouge Wayne Web
- Déploiement cible : **Vercel**

## Démarrage

1. Créer un projet sur [supabase.com](https://supabase.com) (gratuit).
2. Appliquer le schéma : ouvrir le **SQL Editor** du dashboard Supabase et
   exécuter `supabase/migrations/00001_schema.sql`
   (ou `supabase link --project-ref <ref> && supabase db push` avec la CLI).
3. Copier `.env.example` → `.env.local` et remplir :
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` (Settings → API, garder secret)
   - `ANTHROPIC_API_KEY` ([console.anthropic.com](https://console.anthropic.com))
   - `NEXT_PUBLIC_SITE_URL` (http://localhost:3000 en dev)
4. Facultatif mais recommandé en dev : dans Supabase → Authentication →
   Providers → Email, désactiver « Confirm email » pour tester l'inscription
   sans boîte mail.
5. `npm install && npm run dev`

## Le système de crédits (anti-abus)

- **100 crédits offerts** à l'inscription (trigger `handle_new_user`).
- **+50 tous les 30 jours**, plafonné à **100** en gratuit — recharge paresseuse
  via `apply_monthly_topup()`, appelée à l'affichage du header (pas de cron).
- Le **solde = somme du ledger** (`credit_ledger`), aucune colonne de solde.
- Débit **atomique côté serveur** : `spend_credits()` sous verrou advisory,
  refuse (402) si insuffisant. Remboursement automatique si la génération
  échoue avant d'avoir produit du texte.
- Rate-limit sur `/api/generate` (10/min/user) et sur la réservation publique
  (5/min/IP).

## Structure

- `app/p/[slug]` — vitrine publique SSR (JSON-LD LocalBusiness, revalidate 60s)
- `app/(app)/…` — espace connecté : espace (onboarding 5 étapes), ma-page
  (éditeur + préview live), agenda (RDV, CRM, horaires, congés, iCal),
  outil/[slug], contexte (profil de voix), credits, resultats, compte
- `app/api/booking/[slug]/{days,slots,event}` — réservation publique
- `app/api/generate` — génération IA streamée (débit crédits)
- `app/api/ical/[token]` — flux iCal privé vers Google Agenda
- `lib/verticals.ts` — métiers + prestations pré-remplies
- `lib/tools-config.ts` — outils IA data-driven (coûts, champs, prompts)
- `supabase/migrations/00001_schema.sql` — schéma complet + RLS + fonctions
