-- Étend le catalogue de langues aux marchés ajoutés après la première version.
-- Les contraintes sont recréées explicitement pour garder les migrations
-- idempotentes sur les environnements déjà initialisés.

do $$
declare item record;
begin
  for item in select * from (values
    ('profiles', 'profiles_locale_check'),
    ('pages', 'pages_default_locale_check'),
    ('pages', 'pages_enabled_locales_check'),
    ('localized_content', 'localized_content_locale_check'),
    ('translation_jobs', 'translation_jobs_locale_check')
  ) as constraints(table_name, constraint_name) loop
    execute format('alter table public.%I drop constraint if exists %I', item.table_name, item.constraint_name);
  end loop;
end $$;

alter table public.profiles add constraint profiles_locale_check
  check (locale in ('fr','en','es','de','it','ru','zh','ja'));
alter table public.pages add constraint pages_default_locale_check
  check (default_locale in ('fr','en','es','de','it','ru','zh','ja'));
alter table public.pages add constraint pages_enabled_locales_check
  check (enabled_locales <@ array['fr','en','es','de','it','ru','zh','ja']::text[] and cardinality(enabled_locales) > 0);
alter table public.localized_content add constraint localized_content_locale_check
  check (locale in ('fr','en','es','de','it','ru','zh','ja'));
alter table public.translation_jobs add constraint translation_jobs_locale_check
  check (locale in ('fr','en','es','de','it','ru','zh','ja'));

create or replace function public.set_page_locales(pid uuid, primary_locale text, locales text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if primary_locale not in ('fr','en','es','de','it','ru','zh','ja')
     or not locales <@ array['fr','en','es','de','it','ru','zh','ja']::text[]
     or cardinality(locales) = 0 then
    raise exception 'invalid_locales' using errcode = 'P0001';
  end if;
  if not primary_locale = any(locales) then locales := array_prepend(primary_locale, locales); end if;
  update pages set default_locale = primary_locale, enabled_locales = array(select distinct unnest(locales))
    where id = pid and user_id = auth.uid();
  if not found then raise exception 'forbidden' using errcode = 'P0001'; end if;
end;
$$;
