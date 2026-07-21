-- Télémétrie technique des appels IA.
--
-- Cette table est volontairement indépendante de credit_ledger :
-- - credit_ledger reste l'autorité de facturation en crédits FLUX ;
-- - ai_usage_events mesure la consommation réelle remontée par Anthropic.
--
-- Migration autonome et idempotente, afin de pouvoir l'appliquer même si la
-- migration globale 00026_admin_dashboard.sql n'a pas encore été déployée.

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  page_id uuid references public.pages(id) on delete set null,
  provider text not null default 'anthropic',
  model text not null,
  operation text not null,
  input_tokens int not null default 0 check (input_tokens >= 0),
  output_tokens int not null default 0 check (output_tokens >= 0),
  cache_creation_tokens int not null default 0 check (cache_creation_tokens >= 0),
  cache_read_tokens int not null default 0 check (cache_read_tokens >= 0),
  latency_ms int check (latency_ms is null or latency_ms >= 0),
  outcome text not null check (outcome in ('success', 'blocked', 'error')),
  error_code text,
  raw_usage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_created_idx
  on public.ai_usage_events(created_at desc);
create index if not exists ai_usage_user_idx
  on public.ai_usage_events(user_id, created_at desc);
create index if not exists ai_usage_operation_idx
  on public.ai_usage_events(operation, created_at desc);

alter table public.generations
  add column if not exists ai_usage_event_id uuid
  references public.ai_usage_events(id) on delete set null;

alter table public.ai_usage_events enable row level security;

-- Aucun accès depuis le navigateur. Les écritures et lectures passent par le
-- client serveur service-role, après les contrôles applicatifs existants.
revoke all on public.ai_usage_events from anon, authenticated;

comment on table public.ai_usage_events is
  'Mesure technique des appels IA ; ne constitue pas le registre de facturation FLUX.';
comment on column public.ai_usage_events.raw_usage is
  'Objet usage brut renvoyé par le fournisseur, conservé pour audit.';
