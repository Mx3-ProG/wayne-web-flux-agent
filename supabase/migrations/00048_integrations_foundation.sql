-- Wayne Web Flux — fondations de la couche d'intégration (Phase 0).
-- Voir INTEGRATIONS_PLAN.md pour l'architecture complète. Purement additif :
-- aucune table existante n'est modifiée en profondeur, seulement enrichie de
-- colonnes nullable/à défaut. Reprend les conventions déjà en place :
--   - tenant = pages.user_id, RLS via exists(select 1 from pages ...) ;
--   - secrets/traitements sensibles dans des fonctions security definer,
--     revoked from public/anon/authenticated (cf. 00038, 00046) ;
--   - pgcrypto déjà activé (00001) pour le chiffrement des identifiants
--     d'intégration.

-- ------------------------------------------------------------ integrations
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  provider text not null,
  status text not null default 'connected'
    check (status in ('connected', 'disconnected', 'error', 'needs_reauth')),
  capabilities text[] not null default '{}',
  external_account_label text,
  last_synced_at timestamptz,
  last_sync_status text check (last_sync_status is null or last_sync_status in ('ok', 'partial', 'error')),
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, provider)
);

create trigger integrations_touch before update on public.integrations
  for each row execute function public.touch_updated_at();

-- -------------------------------------------------- integration_credentials
-- Séparée de `integrations` : jamais renvoyée par une route qui sert du JSON
-- au client, jamais lue par select direct (voir get/set_integration_secret
-- plus bas). La clé de chiffrement vient de l'application (variable
-- d'environnement INTEGRATIONS_ENCRYPTION_KEY), jamais stockée en base.
create table public.integration_credentials (
  integration_id uuid primary key references public.integrations on delete cascade,
  auth_type text not null check (auth_type in ('oauth2', 'api_key', 'basic')),
  encrypted_payload bytea not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger integration_credentials_touch before update on public.integration_credentials
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------- external_entity_mappings
create table public.external_entity_mappings (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  integration_id uuid references public.integrations on delete set null,
  provider text not null,
  external_entity_type text not null check (external_entity_type in
    ('customer', 'appointment', 'product', 'service', 'employee')),
  external_id text not null check (length(external_id) between 1 and 200),
  flux_entity_type text not null check (flux_entity_type in
    ('customer', 'booking', 'product', 'service')),
  flux_entity_id uuid not null,
  external_updated_at timestamptz,
  last_synced_at timestamptz not null default now(),
  sync_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (page_id, provider, external_entity_type, external_id),
  unique (page_id, flux_entity_type, flux_entity_id, provider)
);

create index eem_flux_lookup on public.external_entity_mappings (flux_entity_type, flux_entity_id);
create index eem_integration on public.external_entity_mappings (integration_id);

-- ------------------------------------------------------------------ sync_runs
create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations on delete cascade,
  trigger text not null check (trigger in ('manual', 'scheduled', 'webhook')),
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  stats jsonb not null default '{}'::jsonb,
  error text
);

create index sync_runs_integration on public.sync_runs (integration_id, started_at desc);

-- -------------------------------------------------------------- integration_logs
-- Jamais de PII brute ici : IDs, compteurs, codes d'erreur uniquement.
create table public.integration_logs (
  id bigint generated always as identity primary key,
  integration_id uuid references public.integrations on delete cascade,
  sync_run_id uuid references public.sync_runs on delete cascade,
  level text not null check (level in ('info', 'warn', 'error')),
  message text not null check (length(message) <= 2000),
  created_at timestamptz not null default now()
);

create index integration_logs_integration on public.integration_logs (integration_id, created_at desc);

-- ------------------------------------------------------- colonnes additives
-- `source` distingue l'origine d'une ligne sans jointure (affichage rapide
-- dans un futur Data Hub). Le mapping fin id-externe -> entité FLUX reste
-- dans external_entity_mappings, pas dupliqué ici.
alter table public.customers
  add column if not exists last_name text,
  add column if not exists birthday date,
  add column if not exists tags text[] not null default '{}',
  add column if not exists source text not null default 'flux';

alter table public.bookings
  add column if not exists customer_id uuid references public.customers on delete set null,
  add column if not exists source text not null default 'flux',
  add column if not exists external_updated_at timestamptz;

create index if not exists bookings_customer on public.bookings (customer_id);

alter table public.products
  add column if not exists source text not null default 'flux';

alter table public.services
  add column if not exists source text not null default 'flux';

-- ============================================================== fonctions

-- Chiffrement/déchiffrement des identifiants d'intégration. La clé transite
-- en paramètre depuis l'application (jamais stockée en base). Accès réservé
-- au rôle service (aucun grant à anon/authenticated) : c'est le seul point
-- d'écriture/lecture des secrets, pour garder un point d'audit unique.
create or replace function public.set_integration_secret(
  p_integration_id uuid,
  p_auth_type text,
  p_payload jsonb,
  p_key text,
  p_expires_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_auth_type not in ('oauth2', 'api_key', 'basic') then
    raise exception 'invalid_auth_type';
  end if;
  insert into public.integration_credentials (integration_id, auth_type, encrypted_payload, expires_at)
  values (p_integration_id, p_auth_type, pgp_sym_encrypt(p_payload::text, p_key), p_expires_at)
  on conflict (integration_id) do update
    set auth_type = excluded.auth_type,
        encrypted_payload = excluded.encrypted_payload,
        expires_at = excluded.expires_at,
        updated_at = now();
end;
$$;

create or replace function public.get_integration_secret(
  p_integration_id uuid,
  p_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload text;
begin
  select pgp_sym_decrypt(encrypted_payload, p_key) into v_payload
  from public.integration_credentials
  where integration_id = p_integration_id;

  if v_payload is null then
    return null;
  end if;
  return v_payload::jsonb;
end;
$$;

revoke all on function public.set_integration_secret(uuid, text, jsonb, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_integration_secret(uuid, text) from public, anon, authenticated;

-- ==================================================================== RLS

alter table public.integrations enable row level security;
alter table public.integration_credentials enable row level security;
alter table public.external_entity_mappings enable row level security;
alter table public.sync_runs enable row level security;
alter table public.integration_logs enable row level security;

create policy "own integrations" on public.integrations
  for all using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

create policy "own external mappings" on public.external_entity_mappings
  for all using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

create policy "own sync runs read" on public.sync_runs
  for select using (exists (
    select 1 from public.integrations i
    join public.pages p on p.id = i.page_id
    where i.id = integration_id and p.user_id = auth.uid()
  ));

-- integration_credentials et integration_logs : RLS activée, aucune policy.
-- Seul le rôle service (client admin, cf. lib/supabase/admin.ts) y accède,
-- comme pour rate_limits (00046) et les tables de jobs de traduction (00038).
