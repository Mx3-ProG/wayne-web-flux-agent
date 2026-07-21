-- Ajoute l'arabe (ar) au catalogue de langues, en plus des huit déjà
-- acceptées (fr, en, es, de, it, ru, zh, ja). Migration additive : ne touche
-- pas les migrations déjà appliquées, recrée seulement les contraintes et
-- fonctions qui contiennent une liste de locales codée en dur, à l'identique
-- de la méthode employée par 00035_internationalization_extended_locales.sql.

do $$
declare item record;
begin
  for item in select * from (values
    ('profiles', 'profiles_locale_check'),
    ('pages', 'pages_default_locale_check'),
    ('pages', 'pages_enabled_locales_check'),
    ('localized_content', 'localized_content_locale_check'),
    ('translation_jobs', 'translation_jobs_locale_check'),
    ('page_locale_entitlements', 'page_locale_entitlements_locale_check')
  ) as constraints(table_name, constraint_name) loop
    execute format('alter table public.%I drop constraint if exists %I', item.table_name, item.constraint_name);
  end loop;
end $$;

alter table public.profiles add constraint profiles_locale_check
  check (locale in ('fr','en','es','de','it','ru','zh','ja','ar'));
alter table public.pages add constraint pages_default_locale_check
  check (default_locale in ('fr','en','es','de','it','ru','zh','ja','ar'));
alter table public.pages add constraint pages_enabled_locales_check
  check (enabled_locales <@ array['fr','en','es','de','it','ru','zh','ja','ar']::text[] and cardinality(enabled_locales) > 0);
alter table public.localized_content add constraint localized_content_locale_check
  check (locale in ('fr','en','es','de','it','ru','zh','ja','ar'));
alter table public.translation_jobs add constraint translation_jobs_locale_check
  check (locale in ('fr','en','es','de','it','ru','zh','ja','ar'));
alter table public.page_locale_entitlements add constraint page_locale_entitlements_locale_check
  check (locale in ('fr','en','es','de','it','ru','zh','ja','ar'));

-- set_page_locales : signature actuelle (retourne int, solde après débit),
-- introduite par 00036_language_credits.sql. On la recrée à l'identique en
-- élargissant uniquement les listes de locales acceptées.
create or replace function public.set_page_locales(
  pid uuid,
  primary_locale text,
  locales text[]
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  owned_page public.pages%rowtype;
  target_locales text[];
  missing_count int;
  total_cost int;
  bal int;
begin
  if uid is null then
    raise exception 'unauthorized' using errcode = 'P0001';
  end if;
  if primary_locale not in ('fr','en','es','de','it','ru','zh','ja','ar')
     or locales is null
     or not locales <@ array['fr','en','es','de','it','ru','zh','ja','ar']::text[]
     or cardinality(locales) = 0 then
    raise exception 'invalid_locales' using errcode = 'P0001';
  end if;

  select * into owned_page
  from public.pages
  where id = pid and user_id = uid
  for update;
  if not found then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  target_locales := array(
    select distinct item
    from unnest(array_prepend(primary_locale, locales)) item
  );

  -- La langue source déjà présente est acquise gratuitement, y compris pour
  -- les pages créées après cette migration.
  insert into public.page_locale_entitlements(page_id, locale, credits_spent)
  select pid, item, 0
  from unnest(owned_page.enabled_locales) item
  on conflict (page_id, locale) do nothing;

  select count(*)::int into missing_count
  from unnest(target_locales) item
  where not exists (
    select 1
    from public.page_locale_entitlements entitlement
    where entitlement.page_id = pid and entitlement.locale = item
  );

  total_cost := missing_count * 25;
  perform pg_advisory_xact_lock(hashtext('credits:' || uid::text));
  bal := public.credit_balance(uid);
  if bal < total_cost then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  if total_cost > 0 then
    insert into public.credit_ledger(user_id, delta, reason)
    values (uid, -total_cost, 'storefront:languages:' || array_to_string(target_locales, ','));
  end if;

  insert into public.page_locale_entitlements(page_id, locale, credits_spent)
  select pid, item, 25
  from unnest(target_locales) item
  on conflict (page_id, locale) do nothing;

  perform set_config('app.page_locale_change_authorized', 'on', true);
  update public.pages
  set default_locale = primary_locale,
      enabled_locales = target_locales
  where id = pid;

  return bal - total_cost;
end;
$$;

grant execute on function public.set_page_locales(uuid,text,text[]) to authenticated;

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

  bal := public.credit_balance(uid);
  if bal < 25 then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  insert into public.credit_ledger(user_id, delta, reason)
  values (uid, -25, 'account:language-change:' || target_locale);

  perform set_config('app.locale_change_authorized', 'on', true);
  update public.profiles
  set locale = target_locale
  where user_id = uid;

  return bal - 25;
end;
$$;

grant execute on function public.change_account_locale(text) to authenticated;

create or replace function public.set_initial_production_locale(target_locale text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'unauthorized' using errcode = 'P0001';
  end if;
  if target_locale not in ('fr','en','es','de','it','ru','zh','ja','ar') then
    raise exception 'invalid_locale' using errcode = 'P0001';
  end if;
  if exists(select 1 from public.pages where user_id = uid) then
    raise exception 'initial_locale_locked' using errcode = 'P0001';
  end if;

  perform set_config('app.locale_change_authorized', 'on', true);
  update public.profiles
  set locale = target_locale,
      onboarding_draft = jsonb_set(
        coalesce(onboarding_draft, '{}'::jsonb),
        '{siteLocale}',
        to_jsonb(target_locale),
        true
      )
  where user_id = uid;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0001';
  end if;
end;
$$;

grant execute on function public.set_initial_production_locale(text) to authenticated;
