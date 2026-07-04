-- Wayne Web Flux — offres mises en avant + forfaits (Phase 4)
-- Une « offre » est une carte promo autonome (produit/service/événement) avec
-- prix et prix barré optionnel, affichée en grand en haut de la vitrine.
-- Le nombre d'offres est limité par le forfait (free: 2, plus: 5).

alter table public.profiles
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'plus'));

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  title text not null,
  description text not null default '',
  image_url text,
  kind text not null default 'produit' check (kind in ('produit', 'service', 'evenement')),
  price_cents int not null default 0 check (price_cents >= 0),
  compare_at_cents int check (compare_at_cents is null or compare_at_cents >= 0),
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index offers_page on public.offers (page_id, position);

-- Traçabilité des ventes d'offres (product_id est déjà nullable).
alter table public.order_items
  add column if not exists offer_id uuid references public.offers on delete set null;

-- ==================================================================== RLS
alter table public.offers enable row level security;

create policy "own offers" on public.offers
  for all using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

-- Lecture publique : offres actives des vitrines publiées.
create policy "public offers read" on public.offers
  for select using (
    active and exists (select 1 from public.pages p where p.id = page_id and p.published)
  );
