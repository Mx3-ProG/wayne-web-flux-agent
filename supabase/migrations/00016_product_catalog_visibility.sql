-- Unifie le catalogue visible : un item de /produits peut être un produit
-- commandable ou un créneau réservable. La colonne active pilote l'affichage.

alter table public.products
  add column if not exists kind text not null default 'product'
    check (kind in ('product', 'reservation')),
  add column if not exists duration_min int not null default 60
    check (duration_min between 5 and 600);

alter table public.service_families
  add column if not exists product_category_id uuid
    references public.product_categories on delete cascade;

alter table public.services
  add column if not exists product_id uuid
    references public.products on delete cascade;

create unique index if not exists service_families_product_category_id_unique
  on public.service_families (product_category_id)
  where product_category_id is not null;

create unique index if not exists services_product_id_unique
  on public.services (product_id)
  where product_id is not null;
