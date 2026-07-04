-- Wayne Web Flux — e-commerce (Phase 1)
-- Produits vendables (sans durée), commandes sans paiement en ligne, et
-- notifications propriétaire. Miroir volontaire des tables service_families /
-- services / bookings pour rester cohérent avec le schéma existant.

-- ------------------------------------------------------ catégories/produits
-- Miroir de service_families.
create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  name text not null,
  position int not null default 0
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.product_categories on delete set null,
  page_id uuid not null references public.pages on delete cascade,
  name text not null,
  description text not null default '',
  price_cents int not null default 0 check (price_cents >= 0),
  image_url text,
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index products_page on public.products (page_id, position);

-- --------------------------------------------------------------- commandes
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  first_name text not null,
  phone text not null,
  email text,
  note text not null default '',
  status text not null default 'pending'
    check (status in ('pending','accepted','fulfilled','cancelled')),
  total_cents int not null default 0 check (total_cents >= 0),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create index orders_page_status on public.orders (page_id, status, created_at desc);

-- Copie immuable du nom/prix au moment de la commande (comme bookings).
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  product_id uuid references public.products on delete set null,
  name text not null,
  unit_price_cents int not null default 0 check (unit_price_cents >= 0),
  quantity int not null default 1 check (quantity > 0),
  line_total_cents int not null default 0 check (line_total_cents >= 0)
);
create index order_items_order on public.order_items (order_id);

-- ------------------------------------------------------------ notifications
-- Table générique : commandes (Phase 1) et réservations.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  page_id uuid not null references public.pages on delete cascade,
  type text not null check (type in ('order','booking')),
  ref_id uuid,
  title text not null default '',
  body text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user on public.notifications (user_id, read, created_at desc);

-- ==================================================================== RLS
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.notifications enable row level security;

-- Propriétaire : accès complet via pages.user_id (miroir des policies services).
create policy "own product categories" on public.product_categories
  for all using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

create policy "own products" on public.products
  for all using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

create policy "own orders" on public.orders
  for all using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

create policy "own order items" on public.order_items
  for all using (exists (
    select 1 from public.orders o join public.pages p on p.id = o.page_id
    where o.id = order_id and p.user_id = auth.uid()))
  with check (exists (
    select 1 from public.orders o join public.pages p on p.id = o.page_id
    where o.id = order_id and p.user_id = auth.uid()));

create policy "own notifications" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Lecture publique : produits actifs des vitrines publiées (rendu SSR anonyme).
-- Les commandes sont créées via route API (client admin), aucune policy insert
-- publique ici.
create policy "public product categories read" on public.product_categories
  for select using (exists (select 1 from public.pages p where p.id = page_id and p.published));
create policy "public products read" on public.products
  for select using (
    active and exists (select 1 from public.pages p where p.id = page_id and p.published)
  );
