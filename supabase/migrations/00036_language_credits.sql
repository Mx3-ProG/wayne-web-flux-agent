-- La langue choisie pendant l'onboarding est gratuite. Une modification
-- ultérieure du compte et chaque nouvelle langue publique coûtent 25 crédits.
-- Les données existantes ne sont ni supprimées ni traduites implicitement.

create table if not exists public.page_locale_entitlements (
  page_id uuid not null references public.pages(id) on delete cascade,
  locale text not null check (locale in ('fr','en','es','de','it','ru','zh','ja')),
  credits_spent int not null default 0 check (credits_spent >= 0),
  created_at timestamptz not null default now(),
  primary key (page_id, locale)
);

alter table public.page_locale_entitlements enable row level security;

create policy "owners read page locale entitlements"
  on public.page_locale_entitlements for select
  using (
    exists (
      select 1 from public.pages p
      where p.id = page_id and p.user_id = auth.uid()
    )
  );

insert into public.page_locale_entitlements(page_id, locale, credits_spent)
select p.id, locale, 0
from public.pages p
cross join lateral unnest(p.enabled_locales) locale
on conflict (page_id, locale) do nothing;

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
  if target_locale not in ('fr','en','es','de','it','ru','zh','ja') then
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
  if target_locale not in ('fr','en','es','de','it','ru','zh','ja') then
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

create or replace function public.guard_profile_locale_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.locale is distinct from new.locale
     and coalesce(current_setting('app.locale_change_authorized', true), '') <> 'on' then
    raise exception 'locale_change_requires_paid_function' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_locale_change on public.profiles;
create trigger guard_profile_locale_change
before update of locale on public.profiles
for each row execute function public.guard_profile_locale_change();

-- Le type de retour change de void à int afin de renvoyer le nouveau solde.
drop function if exists public.set_page_locales(uuid, text, text[]);

create function public.set_page_locales(
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
  if primary_locale not in ('fr','en','es','de','it','ru','zh','ja')
     or locales is null
     or not locales <@ array['fr','en','es','de','it','ru','zh','ja']::text[]
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

create or replace function public.guard_page_locale_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (
    old.default_locale is distinct from new.default_locale
    or old.enabled_locales is distinct from new.enabled_locales
  ) and coalesce(current_setting('app.page_locale_change_authorized', true), '') <> 'on' then
    raise exception 'page_locale_change_requires_paid_function' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_page_locale_change on public.pages;
create trigger guard_page_locale_change
before update of default_locale, enabled_locales on public.pages
for each row execute function public.guard_page_locale_change();
