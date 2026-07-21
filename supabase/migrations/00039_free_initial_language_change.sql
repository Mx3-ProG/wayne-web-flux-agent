-- La langue du compte se décide au tout début du parcours /commencer et doit
-- rester GRATUITE tant que l'utilisateur n'a rien construit. Jusqu'ici
-- change_account_locale facturait 25 crédits pour TOUT changement, y compris
-- pour un compte encore vide tombé en français par défaut (visiteur qui n'a pas
-- cliqué la planète, ancien compte créé avant le sélecteur…). Résultat : payer
-- pour atteindre sa vraie langue principale. C'est incohérent avec
-- set_initial_production_locale, qui est gratuit tant qu'aucune page n'existe.
--
-- Nouvelle règle, alignée sur la sémantique du tunnel :
--   - AUCUNE page  → changement gratuit (on est encore en phase de réglage) ;
--   - au moins une page → 25 crédits (le changement re-traduit la vitrine, d'où
--     le coût, comme STOREFRONT_LANGUAGE_COST).
create or replace function public.change_account_locale(target_locale text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  current_locale text;
  bal int;
  has_pages boolean;
begin
  if uid is null then
    raise exception 'unauthorized' using errcode = 'P0001';
  end if;
  if target_locale not in ('fr','en','es','de','it','ru','zh','ja','ar') then
    raise exception 'invalid_locale' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('credits:' || uid::text));
  select locale into current_locale
  from public.profiles
  where user_id = uid
  for update;

  if current_locale is null then
    raise exception 'profile_not_found' using errcode = 'P0001';
  end if;
  if current_locale = target_locale then
    return public.credit_balance(uid);
  end if;

  -- Tant que le compte n'a aucune boutique, il est encore en phase de réglage :
  -- fixer/corriger sa langue principale est gratuit et illimité.
  has_pages := exists(select 1 from public.pages where user_id = uid);

  bal := public.credit_balance(uid);

  if has_pages then
    if bal < 25 then
      raise exception 'insufficient_credits' using errcode = 'P0001';
    end if;
    insert into public.credit_ledger(user_id, delta, reason)
    values (uid, -25, 'account:language-change:' || target_locale);
    bal := bal - 25;
  end if;

  perform set_config('app.locale_change_authorized', 'on', true);
  update public.profiles
  set locale = target_locale
  where user_id = uid;

  return bal;
end;
$$;

grant execute on function public.change_account_locale(text) to authenticated;
