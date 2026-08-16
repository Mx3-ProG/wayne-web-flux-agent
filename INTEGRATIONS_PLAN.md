# FLUX — Couche d'intégration : plan technique

> Document de planification. Aucun code de production n'a été modifié pour produire ce plan.
> Portée : audit de l'existant + architecture cible + modèle de données + roadmap. Verticale prioritaire : coiffeurs/salons.

---

## A. État actuel (audit)

### A.1 Stack et architecture générale

- **Next.js 16** (App Router), une seule app Vercel. Pas de backend séparé : les routes `app/api/**/route.ts` sont le seul « serveur ».
- **Supabase** = Postgres + Auth + Storage. Toute la logique métier sensible (crédits, commandes, jobs) vit dans des **fonctions Postgres `security definer`**, pas dans le code applicatif. C'est une convention forte et cohérente dans tout le repo (`supabase/migrations/00001` à `00047`).
- **Pas de queue externe** (pas de Redis/BullMQ/SQS). Le pattern « job asynchrone » existant est **100 % Postgres + cron HTTP** :
  - Table de jobs avec `status` (`queued/processing/completed/error`), `attempts`, `locked_at`.
  - RPC `claim_*_job()` avec `for update skip locked` pour verrouillage sans contention.
  - RPC `complete_*_job()` / `fail_*_job()` transactionnelles.
  - RPC `reap_stalled_*_jobs()` pour reprendre les jobs bloqués (> 10 min).
  - Une route `app/api/cron/<worker>/route.ts` protégée par `Authorization: Bearer CRON_SECRET`, appelée par un cron externe (Vercel Cron), qui boucle sur `MAX_JOBS_PER_RUN` claims.
  - Vu deux fois à l'identique : `translation_jobs` (00038, worker `app/api/cron/translate-jobs`) et les push notifications (00032, `app/api/cron/push-deliveries`).
  - **C'est le pattern à réutiliser tel quel pour les imports CSV et la synchronisation des connecteurs.** Aucune nouvelle brique d'infra n'est nécessaire pour le MVP.
- **Idempotence de webhook** déjà résolue : `app/api/stripe/webhook/route.ts` + table `stripe_webhook_events` + RPC `claim_stripe_event(event_id, event_type)` qui fait un « claim avant traitement » (dédoublonnage par id d'événement fournisseur). **Même pattern à cloner pour les webhooks des connecteurs.**
- **Rate limiting persistant** : `public.hit_rate_limit(bucket, max_hits, window_ms)` (00046), un compteur par bucket en base, partagé entre toutes les instances serverless (contrairement à un `Map` en mémoire). Directement réutilisable pour throttle les appels sortants vers les APIs fournisseurs par organisation/provider.
- **IA** : `@anthropic-ai/sdk` isolé dans `lib/claude.ts`, utilisé aujourd'hui uniquement par « FLUX » l'assistant de rédaction/design de la vitrine (`lib/flux/*`). Pattern de sécurité notable : les schémas Zod (`lib/flux/schemas.ts`) définissent strictement ce que le modèle a le droit d'écrire, et `lib/flux/guardrails.ts` revalide côté serveur avant toute écriture. **Ce pattern (allowlist stricte + revalidation serveur, jamais de SQL généré par le LLM) doit être répliqué pour un futur assistant qui interroge les données métier.**
- `lib/assistant/*` est un système **déterministe** (pas de LLM) de suggestions/onboarding — sans rapport avec l'assistant conversationnel envisagé en section 11 du brief. À ne pas confondre.
- **i18n** : 6 langues via un rewrite dans `proxy.ts` (pas de segment `[lang]`, à cause d'un conflit avec `[adminKey]`). Toute UI nouvelle doit suivre `lib/i18n/dictionaries/<locale>/*.json`.

### A.2 Modèle multi-tenant actuel — point critique

**Il n'existe pas de table `organizations`.** La frontière de tenant aujourd'hui, c'est `public.pages` :

```
auth.users (1) ──── (N) public.pages   -- multi-projets depuis la migration 00008
                          │               (profiles.active_page_id = projet courant)
                          ├── services, service_families
                          ├── schedules, blocked_periods
                          ├── bookings          (= rendez-vous)
                          ├── customers         (= CRM minimal)
                          ├── products, offers
                          └── ...
```

- `page_id` est *de facto* l'identifiant d'organisation partout dans le schéma — **et non `user_id`**, correction importante : depuis la migration 00008 (« multi-projets »), un utilisateur peut posséder plusieurs `pages` (l'ancien index unique `pages_one_per_user` a été supprimé), avec un « projet actif » résolu via `profiles.active_page_id` (repli sur la page la plus récente si absent, cf. `lib/active-project.ts`). La couche d'intégration doit donc scoper **tout** par `page_id`, jamais par `user_id` — c'est déjà le choix retenu dans le modèle de données (section C) et la migration 00048.
- RLS partout : `auth.uid() = pages.user_id`, ou `exists(select 1 from pages where id = page_id and user_id = auth.uid())` sur les tables filles. Convention constante et saine — **à répliquer pour toute nouvelle table**, pas de nouveau mécanisme d'isolation à inventer.
- Toujours pas de notion d'équipe/employés multiples avec des comptes séparés, pas de rôles, à l'intérieur d'un même projet/page. C'est cohérent avec la cible indépendants/TPE, mais c'est une limite réelle face à des connecteurs comme Planity qui modélisent plusieurs employés par salon (cf. section C.6, risque à trancher).
- `pages.vertical` (text, ex. `coiffeur`, cf. `lib/verticals.ts`) est déjà le levier utilisé pour brancher de la logique spécifique à un métier (onboarding, thèmes). **Bon point d'ancrage pour des préréglages de mapping CSV par verticale.**

### A.3 Entités métier existantes (pertinentes pour le modèle canonique)

| Table | Champs clés | Limites vis-à-vis d'un modèle canonique |
|---|---|---|
| `customers` (00001, +00017) | `page_id, phone (unique par page), first_name, email, note, address` | Pas de `last_name`, `birthday`, `tags`, `marketing_consent` structuré (existe ailleurs, cf. newsletter 00045), pas d'`external_ids`. Clé naturelle = téléphone brut (pas de normalisation E.164 visible). |
| `bookings` | `page_id, service_id, service_name, duration_min, price_cents, date, start_time, first_name, phone, email, status (confirmed/cancelled)` | Pas d'`employee_id` (mono-praticien), pas de `customer_id` (le lien se fait par téléphone, pas de FK), `status` très pauvre (pas de `completed/no_show`). |
| `services` | `family_id, page_id, name, duration_min, price_cents, position` | Solide, transposable en `Service` canonique quasi tel quel. |
| `products`, `offers` | catalogue e-commerce | Existant, à mapper vers `Product` canonique. |
| `orders` (+ `order_items`) | commandes e-commerce, avec `create_guest_order` RPC transactionnelle | Bon modèle de `Transaction`. |

**Constat** : il y a déjà un CRM et un agenda internes, mais taillés pour l'usage natif de FLUX, pas pour absorber des données externes hétérogènes. Pas de `customer_id` FK sur `bookings` (juste `phone`), pas d'`external_ids`, pas de table de mapping. Rien à casser : ces tables restent la source de vérité, la couche d'intégration s'ajoute **par-dessus** (nouvelles tables + colonnes additives), sans réécrire l'existant.

### A.4 Ce qui ressemble déjà à un « connecteur »

- **Export iCal** (`app/api/ical/[token]/route.ts`) : flux one-way FLUX → Google/Apple Calendar, en lecture seule, authentifié par un token secret dans l'URL (`profiles.ical_token`), pas d'OAuth. C'est un connecteur de sortie déjà en prod. Précédent utile pour Google Calendar (lecture) avant d'attaquer l'écriture bidirectionnelle.
- **Stripe** : véritable intégration API + webhook + stockage d'identifiants externes (`stripe_customer_id`, `stripe_subscription_id` sur `profiles`) + idempotence. C'est le seul « vrai » connecteur du repo aujourd'hui, mais il est codé en dur dans le cœur du produit (billing), pas au travers d'une abstraction généralisable — logique, un connecteur de paiement plateforme n'a pas vocation à être « débranchable » comme un connecteur métier.

### A.5 Sécurité des secrets — état actuel

Aucun secret par-tenant n'est stocké en base aujourd'hui. Tous les secrets (`STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, clés VAPID) sont des variables d'environnement **globales à l'app**, pas des identifiants OAuth par organisation. `pgcrypto` est déjà activé (00001) mais non utilisé pour du chiffrement de colonnes. **Il n'existe donc aucune brique de chiffrement-at-rest par ligne à ce jour — c'est un composant entièrement nouveau à construire pour stocker des tokens OAuth par organisation (section G).**

### A.6 Points faibles à garder en tête

1. Pas d'`organizations` ni de notion multi-employé → les connecteurs « salon multi-praticiens » demanderont soit un mapping dégradé (tous les RDV externes tombent sur la page unique), soit une extension du modèle (risque, à trancher en Phase 2 seulement si un connecteur concret l'exige).
2. `customers.phone` comme clé naturelle sans normalisation visible → la dédup développée pour les imports doit normaliser (E.164) *avant* de toucher à cette contrainte unique existante, sous peine de collisions silencieuses.
3. `bookings` n'a pas de FK vers `customers` → à combler en même temps que l'on introduit `external_entity_mappings`, plutôt que de complexifier temporairement.
4. Aucun stockage de secret chiffré par tenant → prérequis bloquant avant tout connecteur OAuth (mais pas bloquant pour CSV, qui ne demande aucun secret).

---

## B. Architecture cible

```
 ┌─────────────────────────────────────────────────────────────────────────┐
 │  External Software                                                      │
 │  Planity · Logiciel de caisse · Google Calendar/Business · CSV/Excel    │
 └───────────────────────────────┬─────────────────────────────────────────┘
                                  │ pull (API/CSV) · push (API) · webhook
 ┌───────────────────────────────▼─────────────────────────────────────────┐
 │  CONNECTORS  (lib/integrations/connectors/<provider>/*)                 │
 │  implémentent l'interface Connector + déclarent leurs Capabilities      │
 └───────────────────────────────┬─────────────────────────────────────────┘
 ┌───────────────────────────────▼─────────────────────────────────────────┐
 │  NORMALIZATION LAYER  (lib/integrations/mappers/<provider>.ts)          │
 │  <Provider>Entity → FLUX Canonical Entity, déterministe, sans IA        │
 └───────────────────────────────┬─────────────────────────────────────────┘
 ┌───────────────────────────────▼─────────────────────────────────────────┐
 │  FLUX CANONICAL DATA MODEL  (tables Postgres existantes + additions)    │
 │  customers · bookings · services · products · external_entity_mappings │
 └───────────────────────────────┬─────────────────────────────────────────┘
 ┌───────────────────────────────▼─────────────────────────────────────────┐
 │  BUSINESS LOGIC / DEDUP / SYNC ENGINE                                   │
 │  matching, conflict resolution, event emission                         │
 └───────────────────────────────┬─────────────────────────────────────────┘
 ┌───────────────────────────────▼─────────────────────────────────────────┐
 │  AUTOMATION ENGINE  (event-driven, Phase 4)                             │
 │  customer.inactive.detected → suggestion, appointment.cancelled → ...   │
 └───────────────────────────────┬─────────────────────────────────────────┘
 ┌───────────────────────────────▼─────────────────────────────────────────┐
 │  FLUX ASSISTANT  (lecture seule, fonctions whitelistées, jamais de SQL  │
 │  généré par le LLM — même doctrine que lib/flux/guardrails.ts)          │
 └───────────────────────────────────────────────────────────────────────┘
```

Différence volontaire avec le diagramme du brief : **aucune brique nouvelle d'infra** (pas de service séparé, pas de queue externe). Connectors, Normalization et Sync Engine sont des modules TypeScript dans `lib/integrations/`, exécutés depuis les routes API existantes et les workers cron existants — même style que `lib/translation/*` aujourd'hui.

---

## C. Modèle de données

### C.1 Principe : additif, jamais destructif

Aucune colonne existante n'est renommée ni supprimée. Les tables `customers`, `bookings`, `services`, `products` reçoivent des colonnes **nullable** pour porter la provenance ; le reste est dans de nouvelles tables.

### C.2 Nouvelles tables — cœur de l'intégration

```sql
-- Une organisation ne connaît que les providers qu'elle a explicitement connectés.
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  provider text not null,                 -- 'planity' | 'google_calendar' | 'csv' | ...
  status text not null default 'connected'
    check (status in ('connected','disconnected','error','needs_reauth')),
  capabilities text[] not null default '{}',   -- snapshot des Capabilities actives
  external_account_label text,            -- ex: "Salon Dupont — compte Planity"
  last_synced_at timestamptz,
  last_sync_status text check (last_sync_status in ('ok','partial','error')),
  last_error text,
  metadata jsonb not null default '{}',   -- non-sensible uniquement
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, provider)              -- une seule connexion active par provider/page (MVP)
);

-- Secrets chiffrés, SÉPARÉS de la table integrations (jamais lus par une
-- route qui sert du JSON au client). pgcrypto (pgp_sym_encrypt) avec une clé
-- applicative hors base (env var), pas de clé stockée à côté du secret.
create table public.integration_credentials (
  integration_id uuid primary key references public.integrations on delete cascade,
  auth_type text not null check (auth_type in ('oauth2','api_key','basic')),
  encrypted_payload bytea not null,       -- pgp_sym_encrypt(json, app_key)
  expires_at timestamptz,                 -- pour rotation proactive des tokens OAuth
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- RLS: aucune policy pour authenticated/anon. Accès service-role uniquement,
-- au travers de fonctions security definer dédiées (get_integration_secret,
-- set_integration_secret) — jamais de select direct, même côté serveur admin,
-- pour garder un seul point d'audit.

create table public.external_entity_mappings (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  integration_id uuid references public.integrations on delete set null,
  provider text not null,
  external_entity_type text not null,     -- 'customer' | 'appointment' | 'product' | 'service' | 'employee'
  external_id text not null,
  flux_entity_type text not null,
  flux_entity_id uuid not null,
  external_updated_at timestamptz,
  last_synced_at timestamptz not null default now(),
  sync_hash text,                          -- hash du payload normalisé, anti-boucle (section F.4)
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (page_id, provider, external_entity_type, external_id),
  unique (page_id, flux_entity_type, flux_entity_id, provider)
);
create index eem_flux_lookup on public.external_entity_mappings (flux_entity_type, flux_entity_id);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations on delete cascade,
  trigger text not null check (trigger in ('manual','scheduled','webhook')),
  status text not null default 'running' check (status in ('running','completed','failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  stats jsonb not null default '{}',       -- {fetched, created, updated, skipped, errors}
  error text
);

create table public.integration_logs (
  id bigint generated always as identity primary key,
  integration_id uuid references public.integrations on delete cascade,
  sync_run_id uuid references public.sync_runs on delete cascade,
  level text not null check (level in ('info','warn','error')),
  message text not null,               -- jamais de PII brute : IDs, compteurs, codes d'erreur
  created_at timestamptz not null default now()
);
```

### C.3 Import CSV

```sql
create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  entity_type text not null check (entity_type in
    ('customers','appointments','products','services','employees')),
  status text not null default 'uploaded'
    check (status in ('uploaded','mapping','ready','processing','completed','failed','cancelled')),
  file_name text not null,
  file_path text not null,             -- storage bucket 'imports', même politique que 'page-photos'
  detected_delimiter text,
  detected_encoding text,
  column_mapping jsonb not null default '{}',   -- {"Nom client": "lastName", ...}
  total_rows int,
  imported_rows int not null default 0,
  merged_rows int not null default 0,
  skipped_rows int not null default 0,
  error_rows int not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.import_row_errors (
  id bigint generated always as identity primary key,
  import_job_id uuid not null references public.import_jobs on delete cascade,
  row_number int not null,
  reason text not null,
  raw_row jsonb not null
);
```

### C.4 Colonnes additives sur les tables existantes

```sql
alter table public.customers
  add column if not exists last_name text,
  add column if not exists birthday date,
  add column if not exists tags text[] not null default '{}',
  add column if not exists source text not null default 'flux',   -- 'flux'|'csv'|'planity'|...
  add column if not exists external_ids jsonb not null default '{}';

alter table public.bookings
  add column if not exists customer_id uuid references public.customers on delete set null,
  add column if not exists source text not null default 'flux',
  add column if not exists external_updated_at timestamptz;

alter table public.products add column if not exists source text not null default 'flux';
alter table public.services add column if not exists source text not null default 'flux';
```

`source` + `external_entity_mappings` suffisent : pas besoin de dupliquer `external_ids` sur chaque table (redondant avec la table de mapping) — la colonne `external_ids` sur `customers` ci-dessus est en fait **superflue** si `external_entity_mappings` est la source de vérité ; je la retire du MVP (YAGNI, cf. section J) et ne garde que `source` pour affichage rapide dans le Data Hub sans jointure.

### C.5 RLS

Toutes les nouvelles tables suivent exactement la convention existante :
```sql
alter table public.integrations enable row level security;
create policy "own integrations" on public.integrations
  for all using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));
-- idem pour external_entity_mappings, sync_runs (via integration_id → page_id), import_jobs, import_row_errors
-- integration_credentials et integration_logs : AUCUNE policy authenticated (accès service-role uniquement)
```

### C.6 Sur le multi-employé (risque assumé)

Le MVP **ne** crée **pas** de table `employees`. Un connecteur qui expose plusieurs praticiens (Planity) mappe tous ses RDV sur la page unique, avec le nom de l'employé externe stocké dans `bookings.metadata` ou un futur champ texte simple — pas de modélisation relationnelle avant qu'un vrai connecteur multi-praticien soit sur la table. Complexifier le schéma pour un besoin hypothétique serait du sur-engineering (cf. section 24/J).

---

## D. Interface des connecteurs

```typescript
// lib/integrations/types.ts

export type Capability =
  | "READ_CUSTOMERS" | "WRITE_CUSTOMERS"
  | "READ_APPOINTMENTS" | "WRITE_APPOINTMENTS"
  | "READ_SERVICES"
  | "READ_PRODUCTS" | "WRITE_PRODUCTS"
  | "READ_TRANSACTIONS"
  | "WEBHOOKS";

export interface ConnectorContext {
  pageId: string;
  integrationId: string;
  getSecret(): Promise<Record<string, string>>;   // déchiffre via RPC service-role, jamais en clair côté client
  logger: { info(msg: string, meta?: object): void; warn: ...; error: ... };
}

export interface Connector {
  readonly provider: string;
  readonly capabilities: readonly Capability[];

  authenticate(ctx: ConnectorContext, input: OAuthCallbackInput | ApiKeyInput): Promise<ConnectorAuthResult>;
  refreshAuthentication?(ctx: ConnectorContext): Promise<ConnectorAuthResult>;
  disconnect(ctx: ConnectorContext): Promise<void>;

  // Pull — pagination + curseur incrémental gérés par le connecteur
  fetchCustomers?(ctx: ConnectorContext, since?: string): AsyncGenerator<RawRecord>;
  fetchAppointments?(ctx: ConnectorContext, since?: string): AsyncGenerator<RawRecord>;
  fetchServices?(ctx: ConnectorContext): AsyncGenerator<RawRecord>;
  fetchProducts?(ctx: ConnectorContext): AsyncGenerator<RawRecord>;

  // Push — un seul enregistrement à la fois, retourne l'external id
  pushCustomer?(ctx: ConnectorContext, customer: CanonicalCustomer): Promise<{ externalId: string }>;
  pushAppointment?(ctx: ConnectorContext, appt: CanonicalAppointment): Promise<{ externalId: string }>;
  updateAppointment?(ctx: ConnectorContext, externalId: string, patch: Partial<CanonicalAppointment>): Promise<void>;

  // Webhook — payload déjà vérifié (signature) par la route avant d'arriver ici
  handleWebhook?(ctx: ConnectorContext, event: RawRecord): Promise<CanonicalEvent[]>;

  mapToCanonical(entityType: string, raw: RawRecord): CanonicalEntity;   // pur, sans IA, sans I/O
}
```

- Un connecteur ne déclare que les méthodes correspondant à ses `capabilities` — pas d'implémentation factice des méthodes non supportées (`fetchAppointments` absent plutôt que levant une exception).
- `fetchX` retourne un `AsyncGenerator` pour que le sync engine consomme page par page sans charger 50k lignes en mémoire dans une function serverless à mémoire/temps limités.
- Le registre `lib/integrations/registry.ts` mappe `provider → Connector`, dans le même esprit que `lib/verticals.ts` (table statique, pas de découverte dynamique).

---

## E. Pipeline CSV

```
Upload (Storage bucket 'imports', même RLS pattern que 'page-photos')
   │
   ▼
Analyse auto (route API, synchrone, fichier < ~5 Mo)
   • détection séparateur (,;\t) et encodage (utf-8/latin1) — libs légères, pas d'IA
   • lecture des en-têtes + échantillon de 20 lignes
   │
   ▼
Proposition de mapping — DÉTERMINISTE d'abord :
   • dictionnaire de synonymes par entité/verticale (lib/integrations/csv/synonyms.ts)
     "Nom client"/"Nom"/"Client" → lastName, "Portable"/"Mobile"/"Tél" → phone, etc.
   • score de correspondance par colonne (Levenshtein/normalisation) sur les en-têtes SEULEMENT
   • fallback IA optionnel UNIQUEMENT sur les en-têtes non résolues (≤ quelques mots
     chacune) — jamais les valeurs des lignes → respecte "ne jamais envoyer inutilement
     des données personnelles à un LLM"
   │
   ▼
Écran de correction manuelle du mapping + preview (10 lignes transformées)
   │
   ▼
Validation → import_jobs.status = 'ready' → job créé, traité par le worker cron
   (même pattern claim/complete/fail que translation_jobs), PAS de traitement
   synchrone dans la requête HTTP au-delà de quelques centaines de lignes.
   │
   ▼
Pour chaque ligne : mapping → CanonicalEntity → dédup (section F) → upsert
   → import_row_errors si échec de validation (Zod) — jamais d'arrêt total du job
   │
   ▼
Rapport final (import_jobs: imported_rows/merged_rows/skipped_rows/error_rows)
   + export des lignes en erreur (CSV téléchargeable) pour correction/réimport
```

**Annulation** : possible uniquement tant que `status IN ('uploaded','mapping','ready')` (rien n'a encore écrit en base). Une fois `processing`/`completed`, on ne fait pas de rollback destructif automatique — trop risqué de supprimer des données déjà potentiellement modifiées par l'utilisateur entre-temps. On propose plutôt un « annuler cet import » qui liste les lignes créées via `external_entity_mappings` (provider = `'csv'`, `external_id` = `import_job_id:row_number`) et permet une suppression **manuelle confirmée**, jamais automatique.

---

## F. Synchronisation

### F.1 Modes

| Mode | Déclencheur | Cas d'usage |
|---|---|---|
| Import unique | Action utilisateur | CSV, migration initiale |
| Pull périodique | Cron (réutilise `app/api/cron/*`) | Providers sans webhook |
| Webhook | Événement fournisseur | Providers qui le supportent (préférer, réduit la latence et le nombre d'appels) |
| Push (FLUX → provider) | Événement FLUX (`appointment.created`, ...) | Uniquement si `WRITE_*` en capability et si l'utilisateur l'a activé explicitement |

### F.2 Idempotence / anti-boucle (section 7 du brief)

- Chaque webhook entrant passe par le même pattern que Stripe : `claim_integration_event(provider, external_event_id)` avant tout traitement → dédoublonnage garanti même si le fournisseur relivre l'événement.
- Chaque écriture FLUX → provider (push) enregistre un `sync_hash` (hash du payload normalisé) dans `external_entity_mappings` **avant** l'appel API sortant.
- Quand un webhook revient sur cette même entité, on compare le hash du payload entrant normalisé à `sync_hash` : **si identique, on ignore** — c'est FLUX lui-même qui a produit ce changement, ce n'est pas une nouvelle information. C'est la protection anti-« data loop » demandée en section 7 du brief, implémentée sans corrélation d'ID côté fournisseur (pas toujours disponible).
- `external_updated_at` (timestamp fournisseur) est toujours comparé à la dernière valeur connue avant d'écrire — pas de traitement d'un événement plus vieux que ce qu'on a déjà.

### F.3 Résolution de conflit

Stratégie retenue : **autorité par champ, avec FLUX comme source de vérité sur les champs qu'il possède exclusivement (prix, disponibilité tarifaire) et provider comme source de vérité sur ce qu'il possède exclusivement.** Pour les champs partagés (statut, horaire d'un RDV), **dernière écriture gagne, avec `external_updated_at`/`updated_at` comme horloge** — pas d'intervention utilisateur systématique (ça ajouterait une tâche manuelle, contraire à l'objectif produit), mais **un conflit est loggé** (`integration_logs`, niveau `warn`) et visible dans le Data Hub pour audit ponctuel, sans notification intrusive.
- Exception : si les deux updates sont à moins de quelques secondes d'écart (horloges désynchronisées entre systèmes), on privilégie l'écriture provider — en cas de doute, on ne veut jamais que FLUX écrase silencieusement une modification faite par le commerçant dans son outil habituel.

### F.4 Retries / rate limit / pagination

- Chaque appel connecteur passe par un wrapper commun (`lib/integrations/http.ts`) : backoff exponentiel (jusqu'à 3 tentatives), respect des headers `Retry-After`, et `hit_rate_limit()` (bucket = `integration:<provider>:<pageId>`) pour ne jamais dépasser le quota déclaré du fournisseur.
- Un connecteur en échec répété (ex. 5 syncs `error` d'affilée) passe `integrations.status = 'error'` et **s'arrête de se relancer automatiquement** — un connecteur cassé ne doit jamais pouvoir mettre l'app à genoux ni spammer un fournisseur hors ligne. L'utilisateur est notifié (réutilise `public.notifications`, type à ajouter `'integration_error'`, même pattern que 00032).

---

## G. Sécurité

- **Secrets** : `integration_credentials.encrypted_payload` via `pgp_sym_encrypt`/`pgp_sym_decrypt` (pgcrypto, déjà activé), clé applicative dans une variable d'environnement dédiée (`INTEGRATIONS_ENCRYPTION_KEY`, jamais dans le repo). Accès en lecture **uniquement** via une fonction `security definer` (`get_integration_secret(integration_id)`) appelée par le client `service_role` depuis une route serveur — jamais de `select *` direct même en admin, pour garder un seul point d'audit et pouvoir logguer chaque déchiffrement.
- **Frontend** : jamais de secret transmis au client. Les flows OAuth passent par une route serveur qui échange le `code` contre un token et l'écrit directement en base côté serveur.
- **Rotation/expiration** : `expires_at` sur `integration_credentials` ; un job cron léger (`refresh-integration-tokens`, même famille que les autres workers) rafraîchit les tokens OAuth arrivant à expiration avant qu'ils ne soient utilisés en échec.
- **Révocation** : déconnexion = suppression immédiate de `integration_credentials` (pas de soft-delete sur les secrets, contrairement aux données métier).
- **Permissions minimales** : chaque connecteur OAuth ne demande que les scopes nécessaires à ses capabilities déclarées — pas de scope large « au cas où ».
- **Multi-tenant** : RLS identique au reste du schéma ; aucune nouvelle policy publique. `integration_credentials`/`integration_logs` sans policy `authenticated` du tout.
- **RGPD** : voir section I (Data Hub) et section « offboarding » ci-dessous.

### Offboarding d'une intégration

Comportement retenu, communiqué clairement à l'utilisateur au moment de la déconnexion (pas de suppression silencieuse) :
1. Les identifiants (`integration_credentials`) sont supprimés immédiatement — révocation d'accès effective.
2. Les données déjà importées (`customers`, `bookings`, …) sont **conservées** avec leur `source` inchangée (l'historique d'un client reste un actif pour le professionnel), mais `integrations.status = 'disconnected'`.
3. `external_entity_mappings` associées sont conservées (pour pouvoir reconnecter plus tard sans tout réimporter en doublon) mais ne sont plus synchronisées.
4. Un lien explicite « Supprimer aussi les données importées depuis [Provider] » est proposé mais **jamais coché par défaut** — action destructive distincte de la déconnexion.

---

## H. UX

Écrans nécessaires (Phase 1/2, sans sur-construire) :

1. **Paramètres → Intégrations** (`app/(app)/compte/integrations`) : liste des providers disponibles, statut connecté/non connecté, dernière synchro, bouton connecter/déconnecter. Reprend le style déjà en place pour `compte/facturation`.
2. **Écran de consentement à la connexion** : ce que FLUX pourra lire/écrire, en langage clair (✓ / ✗), avant le redirect OAuth — pas de jargon technique (« capabilities », « scopes »).
3. **Import CSV** (nouvel onglet, ex. `app/(app)/compte/import`) : upload → mapping (avec preview live) → rapport final. Mapping presté par défaut selon `pages.vertical`.
4. **Data Hub minimal** (Phase 3+) : compteurs par entité et par source, sans détail technique (« 1 810 clients depuis Planity, 932 depuis un import, 100 créés dans FLUX »).
5. **Bandeau d'erreur de synchro** dans le dashboard existant si `integrations.status = 'error'` — pas un écran séparé, l'utilisateur ne doit pas avoir à aller chercher l'info.

Tout le texte suit `lib/i18n/dictionaries/<locale>/`. Pas d'écran de configuration de conflict-resolution manuel dans le MVP — ça ajouterait une tâche récurrente, contraire à l'objectif produit (section 21 du brief).

---

## I. Système d'événements (avis argumenté)

**Ne pas sur-engineer maintenant.** Un vrai bus d'événements (outbox pattern, table `domain_events` + dispatcher) n'est justifié qu'à partir du moment où **plusieurs** automatisations indépendantes doivent réagir au même événement. Aujourd'hui, un seul consommateur existe potentiellement (le futur moteur d'automatisation), donc :

- **MVP (Phase 1-3)** : pas de table d'événements. Les side-effects (ex. « recalculer les créneaux libres après une annulation ») sont des appels de fonction directs dans le code qui traite l'annulation — comme le fait déjà `enqueue_translations_after_publish` (trigger SQL direct, 00038), pas un event bus.
- **Phase 4 (automatisations)** : si plus de 2-3 automatisations indépendantes doivent réagir aux mêmes faits, introduire une table `domain_events` (append-only, `type`, `page_id`, `payload`, `processed_at`) consommée par un worker cron unique — même famille que les jobs existants, pas de Kafka/SNS. Événements candidats alors : `customer.created`, `appointment.cancelled`, `customer.inactive.detected`, `integration.sync.completed`.

---

## J. Analyse de risque produit (section 24 du brief)

**A. Risque de devenir un simple agrégateur.** Réel si l'effort va vers « connecter le plus de providers possible » plutôt que vers les automatisations qui exploitent les données (section 11). Garde-fou : chaque connecteur doit être justifié par au moins une automatisation concrète qu'il débloque, pas par sa seule existence.

**B. Seuil de valeur d'une intégration.** Une intégration mérite son coût de maintenance si elle supprime une tâche **récurrente** (pas ponctuelle). Un import CSV ponctuel ne justifie jamais un connecteur API dédié à lui seul — c'est justement pourquoi le CSV est l'étape 1 : il couvre le cas ponctuel pour (quasiment) tous les fournisseurs sans maintenance récurrente par provider.

**C/D. Quelles données synchroniser vs. laisser à la source.** Synchroniser ce que FLUX exploite activement (agenda, clients, historique) ; laisser dans le logiciel source ce qui est réglementaire/comptable pointu (facturation détaillée, paie) — FLUX n'a pas vocation à devenir un ERP.

**E. Quand bidirectionnel plutôt que lecture seule.** Uniquement quand le geste manuel évité est fréquent ET que l'écriture ne peut pas créer de confusion sur « où est la vérité ». L'agenda (RDV créé dans FLUX doit apparaître dans l'outil que le pro regarde encore par habitude) est le candidat naturel. Le catalogue produit/prix, plus sensible (TVA, conformité), reste lecture seule tant qu'aucun signal fort ne justifie l'écriture.

**F. Intégrations stratégiques pour le PMF coiffure.** Par ordre de valeur probable : (1) CSV universel (couvre tout le monde immédiatement), (2) Google Calendar (déjà à moitié fait via iCal, très demandé), (3) 1 logiciel de réservation dominant chez les coiffeurs (Planity ou équivalent local) si son API est accessible dans des conditions raisonnables — **à valider avant tout engagement**, cf. section K.

**G. Sur-développement à éviter maintenant.** Marketplace de connecteurs, synchronisation bidirectionnelle générique multi-provider, event bus complet, modèle multi-employé, assistant conversationnel « ask my data ». Tous mentionnés dans le brief comme direction long terme, aucun n'est nécessaire pour prouver la valeur sur la verticale coiffure.

---

## K. Roadmap et priorisation

### PHASE 0 — Préparation architecture · ✅ implémentée
- Migration `00048_integrations_foundation.sql` + scaffold `lib/integrations/{types,registry,crypto,http}.ts`.
- **Objectif** : poser les fondations sans rien connecter encore.
- **Tables** : `integrations`, `integration_credentials`, `external_entity_mappings`, `sync_runs`, `integration_logs`, colonnes additives `customers`/`bookings` (section C).
- **Fichiers** : `lib/integrations/types.ts`, `lib/integrations/registry.ts`, `lib/integrations/http.ts` (retry/backoff/rate-limit), `lib/integrations/crypto.ts` (wrapper pgcrypto).
- **Dépendances** : aucune nouvelle lib externe nécessaire.
- **Risques** : sous-dimensionner le modèle canonique et devoir migrer plus tard — mitigé en calquant `Customer`/`Appointment` sur les entités déjà en prod plutôt que sur une spec abstraite.
- **Critères d'acceptation** : migrations appliquées, RLS testée (un user A ne voit aucune ligne d'un user B), aucune régression sur les tables existantes.

### PHASE 1 — Import CSV universel · ✅ implémentée (backend + UI minimale)
- Migration `00049_csv_imports.sql` (`import_jobs`, `import_rows` — fusionne l'ancien `import_row_errors` dans le statut/`error_reason` de chaque ligne, YAGNI), bucket Storage privé `imports`.
- `lib/integrations/csv/{parse,fields,mapping,transform,dedupe,import-writer}.ts` — parseur CSV sans dépendance, synonymes déterministes, Zod par entité, dédup exacte par téléphone.
- `app/api/imports` (upload+analyse), `app/api/imports/[id]` (détail/annulation), `app/api/imports/[id]/mapping` (correction), `app/api/imports/[id]/confirm` (matérialise les lignes), worker `app/api/cron/process-imports` (cron `*/2 * * * *`, ajouté à `vercel.json`).
- `app/(app)/compte/import` + `components/account/import-csv-panel.tsx` : upload → mapping → confirmation. Fonctionnel, mais **pas encore intégré à `lib/i18n`** (texte français en dur) — à corriger avant toute mise en avant hors marché francophone.
- **Non implémenté dans cette passe** : rapport final détaillé dans l'UI (les compteurs sont exposés par l'API mais l'écran ne les affiche qu'en synthèse), dédup "suggérée" (nom+approximatif) — uniquement le exact-match sûr par téléphone.
- **Objectif** : tout professionnel peut importer ses clients/RDV/services depuis n'importe quel export.
- **Risques** : qualité variable des CSV réels (encodages exotiques, colonnes fusionnées) → marge d'erreur tolérée par ligne (implémenté : une ligne en erreur n'interrompt jamais le job).
- **Critères d'acceptation** : migration à appliquer sur la base (voir note ci-dessous) puis test bout-en-bout avec un CSV réel avant mise en avant aux utilisateurs.

### PHASE 2 — Première API stratégique + Google Calendar · ✅ implémentée (push direction FLUX→Google)
- `lib/integrations/connectors/google-calendar/{oauth,connector}.ts` (REST direct, pas de SDK `googleapis`) : OAuth2 (scope minimal `calendar.events`), refresh automatique du token, révocation, `pushAppointment`/`updateAppointment`/`fetchAppointments`.
- `app/api/integrations` (catalogue+statut), `app/api/integrations/[provider]/connect` (redirect OAuth + cookie state anti-CSRF), `.../oauth/callback` (échange + stockage chiffré), `.../disconnect` (révocation + conservation des données déjà synchronisées, cf. § G).
- Écran `/compte/integrations` (consentement ✓/✗ en langage clair) + lien depuis `/compte`.
- **Hook de synchro** : `lib/integrations/sync-hooks.ts`, appelé depuis `acceptBooking`/`cancelBooking` (`app/(app)/agenda/actions.ts`) — un RDV accepté dans FLUX crée l'événement Google Calendar, une annulation le met à jour. Best-effort, jamais bloquant pour l'action agenda.
- **Choix inverse de l'ordre initialement prévu** ("lecture d'abord") : le push (FLUX → Google) apporte la valeur la plus immédiate (suppression de la recopie manuelle, cf. § J.E) et complète l'export iCal déjà en prod (lecture seule). `fetchAppointments` existe dans le connecteur mais **n'est pas encore consommé** — aucune tâche cron ne l'appelle : la lecture (détecter les créneaux personnels occupés) reste un suivi, pas un prérequis de cette phase.
- **Prérequis non technique avant mise en prod** : créer les identifiants OAuth dans Google Cloud Console et poser `GOOGLE_CALENDAR_CLIENT_ID`/`GOOGLE_CALENDAR_CLIENT_SECRET` + `INTEGRATIONS_ENCRYPTION_KEY`.
- **Dépendances** : décision sur le 2ᵉ connecteur (logiciel de réservation coiffure) toujours conditionnée à l'accès API réel (section K « inconnues ») — non traitée dans cette passe.
- **Critères d'acceptation** : connexion OAuth complète depuis `/compte/integrations`, un RDV accepté dans l'agenda FLUX apparaît dans Google Calendar sans action manuelle, une annulation le reflète.

### PHASE 3 — Synchronisation automatique + webhooks · ✅ implémentée (détection, pas d'écriture auto)
- `lib/integrations/connectors/google-calendar/{webhook,delta,token}.ts` : souscription "watch" à la connexion (`subscribeWebhook`), arrêt à la déconnexion (`stopChannel`), pull incrémental par `syncToken` déclenché par le ping webhook (`fetchEventDelta`, gère le 410/resync).
- `POST /api/integrations/[provider]/webhook` : vérifie `X-Goog-Channel-Token` contre le secret stocké (`integrations.metadata`), ignore silencieusement (200) tout canal inconnu/expiré pour ne jamais nourrir une boucle de retry Google.
- `app/api/cron/renew-webhooks` (quotidien, `vercel.json`) : les canaux Google expirent sans endpoint de prolongation — recréation si echéance < 48h.
- **Écart assumé vis-à-vis du plan initial** : le pull delta ne fait QUE détecter et journaliser (`integration_logs`) un désaccord entre l'événement Google et le `booking` FLUX mappé (RDV annulé côté Google alors que FLUX le croit confirmé, horaire/prestation modifiés) — **aucune écriture automatique dans `bookings` depuis l'externe**. Automatiser cette écriture (probablement souhaitable) est une décision produit distincte, pas encore prise : cf. § F.3, la résolution de conflit "dernière écriture gagne" reste à implémenter concrètement une fois la question tranchée.
- **Anti-boucle** : le sens FLUX→Google (agenda) n'a pas besoin de `sync_hash` — il n'y a aucun risque de boucle tant que le sens Google→FLUX ne réécrit rien. Le mécanisme `sync_hash` du plan initial (§ F.2) reste à construire si/quand l'écriture automatique depuis l'externe est activée.
- **Non testé en conditions réelles** : nécessite les identifiants Google en place (Phase 2) et un déploiement joignable publiquement (le webhook Google ne peut pas cibler `localhost`) — à valider en premier avant toute mise en avant utilisateur.
- **Critères d'acceptation** : un événement modifié directement dans Google Calendar (RDV lié à un `booking` FLUX) produit une entrée `integration_logs` dans la minute suivant le ping webhook, sans jamais modifier `bookings`.

### PHASE 4 — Automatisations FLUX · ✅ une automatisation implémentée (clients inactifs)
- `lib/integrations/automations/inactive-customers.ts` — pure, sans I/O ni IA, testée (`inactive-customers.test.ts`, 6 cas). Calcule à partir des `bookings`/`customers` déjà chargés par `/agenda` (aucune requête supplémentaire) : clients dont la dernière visite confirmée dépasse 8 semaines et qui n'ont aucun RDV à venir.
- `components/agenda/inactive-customers-card.tsx` : carte dans `/agenda`, message de relance suggéré par **gabarit déterministe** (pas d'appel LLM — conforme au brief § 4 "ne jamais envoyer inutilement des données personnelles à un LLM si une logique déterministe suffit"), boutons copier/SMS/email.
- **Périmètre volontairement limité à une seule automatisation** (pas "créneaux libres" ni "anniversaires" dans cette passe) : conforme au critère d'acceptation initial — mesurer l'usage réel d'une automatisation avant d'en ajouter une deuxième, plutôt que de livrer un catalogue non validé.
- **Non implémenté** : l'assistant conversationnel en lecture seule (section 11 du brief) reste un chantier à part entière — nouvelle interface de conversation, couche de fonctions whitelistées, revue de sécurité sur le tool-calling. Pas engagé sans validation produit explicite préalable (risque le plus élevé du plan, § J.A).
- **Suivi i18n** : texte français en dur, comme les écrans import/intégrations des phases précédentes.
- **Critère d'acceptation initial non mesurable pour l'instant** : "taux de clic sur une suggestion" suppose un tracking d'usage qui n'existe pas encore sur cette carte — à ajouter avant de juger si l'automatisation mérite d'être étendue.

### PHASE 5 — Data Hub / marketplace (différé)
- Non développé avant qu'au moins 2 connecteurs réels tournent en prod avec des utilisateurs actifs. Prévu dans l'architecture (`integrations.provider` en texte libre, pas d'enum figé) mais pas construit.

### Priorisation

| | Fonctionnalité | Priorité |
|---|---|---|
| P0 | Modèle canonique + `external_entity_mappings` + RLS (Phase 0) | indispensable |
| P0 | Import CSV universel avec dédup (Phase 1) | indispensable |
| P0 | Chiffrement des secrets par tenant (prérequis Phase 2) | indispensable dès le premier connecteur OAuth |
| P1 | Google Calendar (lecture puis écriture) | important |
| P1 | 1 connecteur métier coiffure (si API accessible) | important, conditionné |
| P1 | Dédup avancée (fusion suggérée avec confirmation utilisateur) | important |
| P2 | Webhooks temps réel | plus tard (le pull périodique suffit au début) |
| P2 | Automatisations FLUX (section 11) | plus tard, après au moins 1 connecteur stable |
| P2 | Data Hub visuel | plus tard |
| P3 | Marketplace de connecteurs public | à éviter maintenant |
| P3 | Modèle multi-employé | à éviter tant qu'aucun connecteur concret ne l'exige |
| P3 | Synchronisation bidirectionnelle généralisée à tous les providers | à éviter — au cas par cas (section J.E) |
| P3 | Event bus complet (`domain_events`) | à éviter avant Phase 4 |

### Questions ouvertes

- **Fournisseur API pour la verticale coiffure** : quel logiciel cibler en premier (Planity ou autre) ? Dépend de l'accessibilité réelle de son API (conditions d'utilisation, coût, quotas) — **à valider avant tout engagement de développement**, aucune hypothèse de scraping ou de contournement n'est envisagée (conforme à la contrainte du brief).
- **Multi-employé** : faut-il l'anticiper dès Phase 2 si le connecteur retenu l'exige structurellement, ou dégrader (un seul agenda) pour le MVP ? Décision produit, pas technique.
- **RGPD** : le droit à l'effacement doit-il aussi propager une demande de suppression **côté fournisseur** quand c'est contractuellement possible, ou FLUX se limite-t-il à ses propres données ? À trancher avec l'angle juridique, pas uniquement technique.
- **Coût/quota des APIs tierces** : certains fournisseurs facturent l'usage API — impact sur le pricing FLUX à anticiper avant d'annoncer une intégration publiquement.
