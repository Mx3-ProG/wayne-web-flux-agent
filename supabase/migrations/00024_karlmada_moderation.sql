-- Journal serveur des blocages KarlMada. Aucun accès direct depuis le client :
-- le service role écrit, l'équipe habilitée consulte depuis l'administration.
create table public.karlmada_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  page_id uuid references public.pages(id) on delete set null,
  surface text not null check (char_length(surface) between 1 and 80),
  category text not null check (category in ('adult', 'drugs', 'weapons', 'illegal', 'profanity')),
  rule_code text not null check (char_length(rule_code) between 1 and 80),
  action text not null default 'blocked' check (action = 'blocked'),
  created_at timestamptz not null default now()
);

create index karlmada_events_created_at_idx on public.karlmada_events(created_at desc);
create index karlmada_events_user_id_idx on public.karlmada_events(user_id, created_at desc);
alter table public.karlmada_events enable row level security;

comment on table public.karlmada_events is
  'Audit minimal des contenus bloqués par KarlMada; le contenu saisi n’est jamais conservé.';

-- Toutes les commandes passent désormais par la route serveur qui exécute
-- KarlMada. Ferme l'ancien accès RPC direct depuis un navigateur.
revoke execute on function public.create_guest_order(
  uuid, text, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.create_guest_order(
  uuid, text, text, text, text, text, jsonb
) to service_role;
