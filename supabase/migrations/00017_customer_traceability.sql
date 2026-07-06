-- Wayne Web Flux — fiche client interne et traçabilité commerciale.
-- Les commandes portent l'adresse saisie, et la fiche CRM est enrichie à
-- chaque commande pour permettre le suivi client dans le dashboard.

alter table public.orders
  add column if not exists address text;

alter table public.customers
  add column if not exists address text;

drop function if exists public.create_guest_order(uuid, text, text, text, text, jsonb);
drop function if exists public.create_guest_order(uuid, text, text, text, jsonb);
drop function if exists public.create_guest_order(uuid, text, text, text, text, json);
drop function if exists public.create_guest_order(uuid, text, text, text, json);

create or replace function public.create_guest_order(
  p_page_id uuid,
  p_first_name text,
  p_phone text,
  p_email text default null,
  p_address text default null,
  p_note text default '',
  p_items jsonb default '[]'::jsonb
)
returns table(order_id uuid, total_cents int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_total int := 0;
  v_line_total int;
  v_qty int;
  v_product record;
  v_offer record;
  v_item jsonb;
  v_raw_product_id text;
  v_raw_offer_id text;
  v_product_id uuid;
  v_offer_id uuid;
  v_first_name text := left(trim(coalesce(p_first_name, '')), 60);
  v_phone text := trim(coalesce(p_phone, ''));
  v_email text := nullif(left(trim(coalesce(p_email, '')), 120), '');
  v_address text := nullif(left(trim(coalesce(p_address, '')), 240), '');
begin
  if not exists (
    select 1 from public.pages
    where id = p_page_id and published = true
  ) then
    raise exception 'page_not_found';
  end if;

  if v_first_name = '' or v_phone = '' or jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid_order';
  end if;

  insert into public.orders (
    page_id,
    first_name,
    phone,
    email,
    address,
    note,
    total_cents
  )
  values (
    p_page_id,
    v_first_name,
    v_phone,
    v_email,
    v_address,
    left(trim(coalesce(p_note, '')), 500),
    0
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    begin
      v_qty := floor(coalesce((v_item->>'quantity')::numeric, 0))::int;
    exception when others then
      v_qty := 0;
    end;
    if v_qty <= 0 then
      continue;
    end if;
    v_qty := least(999, v_qty);

    v_raw_product_id := nullif(v_item->>'product_id', '');
    v_raw_offer_id := nullif(v_item->>'offer_id', '');
    v_product_id := case
      when v_raw_product_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then v_raw_product_id::uuid
      else null
    end;
    v_offer_id := case
      when v_raw_offer_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then v_raw_offer_id::uuid
      else null
    end;

    if v_offer_id is not null then
      select id, title as name, price_cents
      into v_offer
      from public.offers
      where id = v_offer_id and page_id = p_page_id and active = true;

      if found then
        v_line_total := v_offer.price_cents * v_qty;
        insert into public.order_items (
          order_id,
          offer_id,
          name,
          unit_price_cents,
          quantity,
          line_total_cents
        )
        values (
          v_order_id,
          v_offer.id,
          v_offer.name,
          v_offer.price_cents,
          v_qty,
          v_line_total
        );
        v_total := v_total + v_line_total;
      end if;
    elsif v_product_id is not null then
      select id, name, price_cents
      into v_product
      from public.products
      where id = v_product_id and page_id = p_page_id and active = true;

      if found then
        v_line_total := v_product.price_cents * v_qty;
        insert into public.order_items (
          order_id,
          product_id,
          name,
          unit_price_cents,
          quantity,
          line_total_cents
        )
        values (
          v_order_id,
          v_product.id,
          v_product.name,
          v_product.price_cents,
          v_qty,
          v_line_total
        );
        v_total := v_total + v_line_total;
      end if;
    end if;
  end loop;

  if v_total <= 0 then
    raise exception 'empty_order';
  end if;

  update public.orders
  set total_cents = v_total
  where id = v_order_id;

  insert into public.customers (page_id, phone, first_name, email, address)
  values (p_page_id, v_phone, v_first_name, v_email, v_address)
  on conflict (page_id, phone) do update
    set first_name = excluded.first_name,
        email = coalesce(excluded.email, public.customers.email),
        address = coalesce(excluded.address, public.customers.address);

  order_id := v_order_id;
  total_cents := v_total;
  return next;
end;
$$;

grant execute on function public.create_guest_order(
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to anon, authenticated;
