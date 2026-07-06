-- Wayne Web Flux — statistiques de fréquentation de la vitrine.
-- Événements bruts (v1) : l'agrégation se fait à la lecture, l'index couvre
-- les requêtes par page et par période. Rollup journalier si le volume l'exige.

create table public.page_events (
  id bigint generated always as identity primary key,
  page_id uuid not null references public.pages on delete cascade,
  kind text not null check (
    kind in ('view', 'phone_click', 'social_click', 'whatsapp_click', 'newsletter_signup')
  ),
  created_at timestamptz not null default now()
);

create index page_events_page_created on public.page_events (page_id, created_at);

alter table public.page_events enable row level security;

-- Tracking public uniquement sur une page publiée (via /api/track).
create policy "public track" on public.page_events
  for insert with check (
    exists (select 1 from public.pages p where p.id = page_id and p.published)
  );

create policy "owner read events" on public.page_events
  for select using (
    exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid())
  );
