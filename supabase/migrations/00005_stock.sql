-- Wayne Web Flux — gestion de stock (Phase 2)
-- Le stock vit sur products.stock ; chaque variation est tracée dans
-- stock_movements (ledger, miroir de credit_ledger). apply_stock_movement()
-- écrit le mouvement ET met à jour products.stock de façon atomique.

alter table public.products
  add column if not exists track_stock boolean not null default false,
  add column if not exists stock int not null default 0;

-- Ledger des mouvements de stock (audit trail, comme credit_ledger).
create table public.stock_movements (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products on delete cascade,
  page_id uuid not null references public.pages on delete cascade,
  delta int not null,
  reason text not null check (reason in ('sale','restock','adjustment','cancel')),
  order_id uuid references public.orders on delete set null,
  created_at timestamptz not null default now()
);
create index stock_movements_product on public.stock_movements (product_id, created_at desc);

-- Mouvement atomique : vérifie la propriété, pose un verrou, écrit le mouvement
-- et recalcule le stock (jamais négatif). Retourne le nouveau stock.
create or replace function public.apply_stock_movement(
  p_product uuid, p_delta int, p_reason text, p_order uuid default null
)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_page uuid;
  v_stock int;
  v_new int;
begin
  if p_reason not in ('sale','restock','adjustment','cancel') then
    raise exception 'invalid_reason';
  end if;
  -- Le produit doit appartenir à une page du user connecté.
  select p.page_id into v_page
    from public.products p
    join public.pages pg on pg.id = p.page_id
    where p.id = p_product and pg.user_id = auth.uid();
  if v_page is null then
    raise exception 'not_found_or_forbidden' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('stock:' || p_product::text));
  select stock into v_stock from public.products where id = p_product;
  v_new := greatest(0, v_stock + p_delta);

  insert into public.stock_movements (product_id, page_id, delta, reason, order_id)
  values (p_product, v_page, p_delta, p_reason, p_order);
  update public.products set stock = v_new where id = p_product;
  return v_new;
end;
$$;

-- RLS : le propriétaire lit ses mouvements ; les inserts passent uniquement par
-- la fonction security definer.
alter table public.stock_movements enable row level security;
create policy "own stock movements read" on public.stock_movements
  for select using (exists (
    select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()
  ));
