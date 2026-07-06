-- Wayne Web Flux — capture d'emails sur la vitrine (bloc newsletter).
-- Écriture via la route /api/subscribe (client admin) ; lecture réservée au
-- propriétaire de la page (dashboard /statistiques).

create table public.page_subscribers (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now(),
  unique (page_id, email)
);

alter table public.page_subscribers enable row level security;

-- Inscription publique uniquement sur une page publiée.
create policy "public subscribe" on public.page_subscribers
  for insert with check (
    exists (select 1 from public.pages p where p.id = page_id and p.published)
  );

create policy "owner read subscribers" on public.page_subscribers
  for select using (
    exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid())
  );

create policy "owner delete subscribers" on public.page_subscribers
  for delete using (
    exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid())
  );
