-- Wayne Web Flux — chiffre d'affaires (Phase 3)
-- CA cumulé d'une vitrine = commandes acceptées/honorées + réservations
-- confirmées déjà passées. Calculé à la volée (pas de colonne stockée pour
-- éviter la dérive). Vérifie la propriété de la page via auth.uid().

create or replace function public.revenue_total(p_page uuid)
returns bigint
language plpgsql stable security definer set search_path = public
as $$
declare
  v_orders bigint;
  v_bookings bigint;
begin
  if not exists (
    select 1 from public.pages where id = p_page and user_id = auth.uid()
  ) then
    return 0;
  end if;

  select coalesce(sum(total_cents), 0) into v_orders
    from public.orders
    where page_id = p_page and status in ('accepted', 'fulfilled');

  select coalesce(sum(price_cents), 0) into v_bookings
    from public.bookings
    where page_id = p_page and status = 'confirmed' and date <= current_date;

  return v_orders + v_bookings;
end;
$$;
