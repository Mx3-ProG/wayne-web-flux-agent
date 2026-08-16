-- FLUX Voice — fondations : configuration de l'agent téléphonique par page
-- (= tenant, comme partout ailleurs dans le schéma) et journal des appels.
--
-- Additif uniquement : aucune table existante n'est modifiée. `page_id` reste
-- la seule frontière de tenant (pas de table `organizations` séparée, cf.
-- convention établie depuis 00001/00008).
--
-- À ne pas confondre avec `public.voice_profiles` (00001) : celle-ci porte le
-- "ton de marque" utilisé par l'assistant de rédaction FLUX (lib/flux/*),
-- rien à voir avec la téléphonie.

create table public.voice_agent_config (
  page_id uuid primary key references public.pages on delete cascade,
  enabled boolean not null default false,

  -- Identité / personnalisation de l'agent
  agent_name text not null default '',
  language text not null default 'fr',
  voice text not null default '',              -- id de voix TTS (dépend du provider)
  tone text not null default '',                -- ex: "chaleureux et professionnel"
  greeting text not null default '',             -- vide = message généré depuis agent_name/business_name
  company_description text not null default '',
  instructions text not null default '',         -- consignes libres du commerçant, injectées dans le contexte

  timezone text not null default 'Europe/Paris',

  -- Téléphonie : le numéro attribué au tenant et son identifiant côté provider.
  phone_number text,
  telephony_provider text not null default 'twilio' check (telephony_provider in ('twilio')),
  telephony_number_id text,

  -- Permissions : périmètre exact des actions que l'agent peut exécuter.
  -- Appliquées côté serveur dans la couche tools (lib/intelligence/permissions.ts),
  -- jamais laissées à l'appréciation du modèle.
  allow_booking boolean not null default true,
  allow_rescheduling boolean not null default false,
  allow_cancellation boolean not null default false,
  allow_customer_creation boolean not null default true,
  allow_sms boolean not null default false,
  allow_transfer_to_human boolean not null default true,
  fallback_phone_number text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Résolution du tenant à partir du numéro appelé (webhook entrant) : un
-- numéro de téléphonie donné pointe vers au plus une configuration active.
create unique index voice_agent_config_number
  on public.voice_agent_config (telephony_provider, telephony_number_id)
  where telephony_number_id is not null;

create trigger voice_agent_config_touch before update on public.voice_agent_config
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------ appels
create table public.voice_calls (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  customer_id uuid references public.customers on delete set null,
  external_call_id text,                         -- id côté provider (Twilio CallSid)
  caller_number text not null default '',
  called_number text not null default '',
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'failed', 'no_answer')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int,
  summary text not null default '',
  outcome text not null default 'unknown'
    check (outcome in (
      'unknown', 'booked', 'rescheduled', 'cancelled',
      'information_only', 'transferred', 'abandoned', 'error'
    )),
  appointment_id uuid references public.bookings on delete set null,
  transferred_to_human boolean not null default false,
  created_at timestamptz not null default now()
);
create index voice_calls_page on public.voice_calls (page_id, started_at desc);
create unique index voice_calls_external_id
  on public.voice_calls (external_call_id)
  where external_call_id is not null;

-- Transcriptions séparées : pas de données conversationnelles dans la table
-- de log principale, pour limiter ce qui est exposé/retenu par défaut.
create table public.voice_call_transcripts (
  id bigint generated always as identity primary key,
  call_id uuid not null references public.voice_calls on delete cascade,
  role text not null check (role in ('caller', 'agent', 'tool', 'system')),
  content text not null default '',
  at timestamptz not null default now()
);
create index voice_call_transcripts_call on public.voice_call_transcripts (call_id, at);

-- ==================================================================== RLS

alter table public.voice_agent_config enable row level security;
alter table public.voice_calls enable row level security;
alter table public.voice_call_transcripts enable row level security;

create policy "own voice agent config" on public.voice_agent_config
  for all using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

create policy "own voice calls" on public.voice_calls
  for select using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));
-- Pas de policy insert/update/delete : les appels sont écrits uniquement par
-- le backend (service role, webhooks Twilio + orchestrateur de session), avec
-- page_id résolu côté serveur à partir du numéro appelé — jamais fourni par
-- le client. Même doctrine que credit_ledger (00001).

create policy "own voice transcripts" on public.voice_call_transcripts
  for select using (
    exists (
      select 1 from public.voice_calls c
      join public.pages p on p.id = c.page_id
      where c.id = call_id and p.user_id = auth.uid()
    )
  );
