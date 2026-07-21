-- Internationalisation du dashboard et des vitrines.

alter table public.profiles
  add column if not exists locale text not null default 'fr'
  check (locale in ('fr', 'en', 'es', 'de', 'it'));

alter table public.pages
  add column if not exists default_locale text not null default 'fr'
  check (default_locale in ('fr', 'en', 'es', 'de', 'it')),
  add column if not exists enabled_locales text[] not null default array['fr']::text[]
  check (enabled_locales <@ array['fr','en','es','de','it']::text[] and cardinality(enabled_locales) > 0);

create table public.localized_content (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  entity_type text not null check (entity_type in ('page','site_page','service_family','service','product_category','product','offer')),
  entity_id uuid not null,
  locale text not null check (locale in ('fr','en','es','de','it')),
  fields jsonb not null default '{}'::jsonb,
  source_hash text not null default '',
  status text not null default 'stale' check (status in ('stale','queued','translating','ready','error')),
  last_error text,
  translated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id, locale)
);
create index localized_content_page_locale on public.localized_content(page_id, locale);

create table public.translation_jobs (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  locale text not null check (locale in ('fr','en','es','de','it')),
  source_version int not null,
  status text not null default 'queued' check (status in ('queued','processing','completed','error')),
  attempts int not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (page_id, locale, source_version)
);
create index translation_jobs_pending on public.translation_jobs(status, available_at);

alter table public.localized_content enable row level security;
alter table public.translation_jobs enable row level security;

create policy "owners read localized content" on public.localized_content for select
  using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));
create policy "public reads ready localized content" on public.localized_content for select
  using (status = 'ready' and exists (
    select 1 from public.pages p
    where p.id = page_id and p.published and locale = any(p.enabled_locales)
  ));
create policy "owners manage localized content" on public.localized_content for all
  using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));
create policy "owners read translation jobs" on public.translation_jobs for select
  using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

create or replace function public.set_page_locales(pid uuid, primary_locale text, locales text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if primary_locale not in ('fr','en','es','de','it')
     or not locales <@ array['fr','en','es','de','it']::text[]
     or cardinality(locales) = 0 then
    raise exception 'invalid_locales' using errcode = 'P0001';
  end if;
  if not primary_locale = any(locales) then locales := array_prepend(primary_locale, locales); end if;
  update pages set default_locale = primary_locale, enabled_locales = array(select distinct unnest(locales))
    where id = pid and user_id = auth.uid();
  if not found then raise exception 'forbidden' using errcode = 'P0001'; end if;
end;
$$;

create or replace function public.enqueue_page_translations(pid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_version int; target_locale text;
begin
  if not exists(select 1 from pages where id = pid and user_id = auth.uid()) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  select coalesce(max(version), 1) into v_version from page_versions where page_id = pid;
  for target_locale in select unnest(enabled_locales) from pages where id = pid loop
    if target_locale <> (select default_locale from pages where id = pid) then
      insert into translation_jobs(page_id, locale, source_version)
      values(pid, target_locale, v_version)
      on conflict(page_id, locale, source_version) do update
        set status = 'queued', available_at = now(), last_error = null;
      -- Ne jamais dépublier l'ancienne traduction : le job signale l'état
      -- obsolète et la nouvelle version la remplacera seulement à son succès.
    end if;
  end loop;
end;
$$;

grant execute on function public.set_page_locales(uuid,text,text[]) to authenticated;
grant execute on function public.enqueue_page_translations(uuid) to authenticated;
