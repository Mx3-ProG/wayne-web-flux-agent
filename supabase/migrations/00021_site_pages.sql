-- Wayne Web Flux — multi-pages par projet (sous-pages).
-- Chaque projet (ligne de `pages`) garde sa page d'accueil dans `pages` ;
-- les sous-pages (/p/slug/a-propos, /p/slug/tarifs…) vivent dans `site_pages`,
-- composées avec le même système de sections/blocs (lib/sections.ts).
-- Workflow brouillon calqué sur les offres : draft jsonb par ligne +
-- draft_status ('new' = jamais publiée donc invisible en public, 'deleted' =
-- suppression différée à la prochaine publication). Publier reste un acte
-- unique à 5 crédits pour TOUT le site (publish_page couvre désormais les
-- sous-pages).

create table public.site_pages (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  path text not null,                  -- segment d'URL relatif : 'a-propos'
  title text not null default '',
  subtitle text not null default '',
  hero_url text,
  seo jsonb not null default '{}'::jsonb,   -- { title, description, ogImageUrl }
  sections jsonb,                      -- PageSection[] (null = page vide)
  position int not null default 0,
  draft jsonb,                         -- overlay { title?, subtitle?, hero_url?, seo?, sections?, path? }
  draft_status text check (draft_status in ('new', 'deleted')),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, path),
  constraint site_pages_path_format
    check (path ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(path) between 1 and 48)
);

create index site_pages_page_idx on public.site_pages (page_id, position);

create trigger site_pages_touch before update on public.site_pages
  for each row execute function public.touch_updated_at();

alter table public.site_pages enable row level security;

create policy "own site_pages" on public.site_pages for all
  using (
    exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid())
  );

-- Une sous-page jamais publiée (draft_status = 'new') reste invisible ; une
-- sous-page en suppression différée reste servie jusqu'à la publication.
create policy "public site_pages read" on public.site_pages for select
  using (
    published
    and draft_status is distinct from 'new'
    and exists (select 1 from public.pages p where p.id = page_id and p.published)
  );

-- ------------------------------------------------- écriture des brouillons
-- Merge jsonb côté SQL (même logique que merge_offer_draft, 00012) pour
-- éviter les races de l'autosave débouncé.
create or replace function public.merge_site_page_draft(spid uuid, fields jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.site_pages sp
    set draft = coalesce(sp.draft, '{}'::jsonb) || fields
    where sp.id = spid
      and exists (select 1 from public.pages p where p.id = sp.page_id and p.user_id = auth.uid());
  if not found then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
end;
$$;

-- ------------------------------------------------------------- publication
-- Reprise INTÉGRALE de la version 00018 (garde-fou d'accès + merge complet),
-- avec en plus l'application des brouillons de sous-pages :
--   - nothing_to_publish tient compte des site_pages en attente ;
--   - suppressions différées appliquées, drafts mergés, published levé ;
--   - conflit d'unicité de path → erreur `path_taken` ;
--   - snapshot page_versions enrichi d'une clé 'site_pages'.
-- Tout champ ajouté à PageDraftFields ou SitePageDraftFields (lib/types.ts)
-- DOIT être ajouté ici.
create or replace function public.publish_page(pid uuid)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid;
  bal int;
  next_version int;
  pending_offers int;
  pending_site_pages int;
  page_row public.pages;
  snap jsonb;
begin
  select user_id into uid from public.pages where id = pid;
  if uid is null or uid <> auth.uid() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  if not public.has_active_access(uid) then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('credits:' || uid::text));

  select count(*) into pending_offers
    from public.offers
    where page_id = pid and (draft is not null or draft_status is not null);
  select count(*) into pending_site_pages
    from public.site_pages
    where page_id = pid and (draft is not null or draft_status is not null);
  if (select draft from public.pages where id = pid) is null
     and pending_offers = 0 and pending_site_pages = 0 then
    raise exception 'nothing_to_publish' using errcode = 'P0001';
  end if;

  bal := public.credit_balance(uid);
  if bal < 5 then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  select coalesce(max(version), 0) + 1 into next_version
    from public.page_versions where page_id = pid;

  insert into public.credit_ledger (user_id, delta, reason)
  values (uid, -5, 'publish:' || pid || ':v' || next_version);

  -- Merge du brouillon vers les colonnes live. L'opérateur `?` distingue
  -- « champ absent » de « champ mis à null » (logo/hero/sections effaçables).
  update public.pages set
    business_name  = case when draft ? 'business_name' then coalesce(draft->>'business_name', '') else business_name end,
    job_title      = case when draft ? 'job_title' then coalesce(draft->>'job_title', '') else job_title end,
    tagline        = case when draft ? 'tagline' then coalesce(draft->>'tagline', '') else tagline end,
    city           = case when draft ? 'city' then coalesce(draft->>'city', '') else city end,
    address        = case when draft ? 'address' then coalesce(draft->>'address', '') else address end,
    phone          = case when draft ? 'phone' then coalesce(draft->>'phone', '') else phone end,
    socials        = case when draft ? 'socials' then coalesce(draft->'socials', '{}'::jsonb) else socials end,
    colors         = case when draft ? 'colors' then coalesce(draft->'colors', '{}'::jsonb) else colors end,
    font           = case when draft ? 'font' then coalesce(draft->>'font', font) else font end,
    theme          = case when draft ? 'theme' then coalesce(draft->>'theme', theme) else theme end,
    logo_url       = case when draft ? 'logo_url' then draft->>'logo_url' else logo_url end,
    hero_url       = case when draft ? 'hero_url' then draft->>'hero_url' else hero_url end,
    gallery        = case when draft ? 'gallery' then coalesce(draft->'gallery', '[]'::jsonb) else gallery end,
    reviews        = case when draft ? 'reviews' then coalesce(draft->'reviews', '[]'::jsonb) else reviews end,
    offer          = case when draft ? 'offer' then coalesce(draft->>'offer', '') else offer end,
    hours_text     = case when draft ? 'hours_text' then coalesce(draft->>'hours_text', '') else hours_text end,
    legal          = case when draft ? 'legal' then coalesce(draft->'legal', '{}'::jsonb) else legal end,
    sections       = case when draft ? 'sections' then nullif(draft->'sections', 'null'::jsonb) else sections end,
    seo            = case when draft ? 'seo' then coalesce(draft->'seo', '{}'::jsonb) else seo end,
    promo          = case when draft ? 'promo' then nullif(draft->'promo', 'null'::jsonb) else promo end,
    floating_cta   = case when draft ? 'floating_cta' then nullif(draft->'floating_cta', 'null'::jsonb) else floating_cta end,
    hero_video_url = case when draft ? 'hero_video_url' then draft->>'hero_video_url' else hero_video_url end,
    hide_branding  = case when draft ? 'hide_branding' then coalesce((draft->>'hide_branding')::boolean, false) else hide_branding end,
    draft = null
  where id = pid;

  -- Offres : suppressions différées appliquées, brouillons mergés, statuts levés.
  delete from public.offers where page_id = pid and draft_status = 'deleted';
  update public.offers set
    title            = case when draft ? 'title' then coalesce(draft->>'title', title) else title end,
    description      = case when draft ? 'description' then coalesce(draft->>'description', '') else description end,
    kind             = case when draft ? 'kind' then coalesce(draft->>'kind', kind) else kind end,
    price_cents      = case when draft ? 'price_cents' then coalesce((draft->>'price_cents')::int, price_cents) else price_cents end,
    compare_at_cents = case when draft ? 'compare_at_cents' then (draft->>'compare_at_cents')::int else compare_at_cents end,
    image_url        = case when draft ? 'image_url' then draft->>'image_url' else image_url end,
    active           = case when draft ? 'active' then coalesce((draft->>'active')::boolean, active) else active end,
    draft = null,
    draft_status = null
  where page_id = pid and (draft is not null or draft_status is not null);

  -- Sous-pages : même traitement que les offres. Le changement de path passe
  -- aussi par le draft — un conflit d'unicité remonte en `path_taken`.
  delete from public.site_pages where page_id = pid and draft_status = 'deleted';
  begin
    update public.site_pages set
      path      = case when draft ? 'path' then coalesce(draft->>'path', path) else path end,
      title     = case when draft ? 'title' then coalesce(draft->>'title', '') else title end,
      subtitle  = case when draft ? 'subtitle' then coalesce(draft->>'subtitle', '') else subtitle end,
      hero_url  = case when draft ? 'hero_url' then draft->>'hero_url' else hero_url end,
      seo       = case when draft ? 'seo' then coalesce(draft->'seo', '{}'::jsonb) else seo end,
      sections  = case when draft ? 'sections' then nullif(draft->'sections', 'null'::jsonb) else sections end,
      published = true,
      draft = null,
      draft_status = null
    where page_id = pid and (draft is not null or draft_status is not null);
  exception when unique_violation then
    raise exception 'path_taken' using errcode = 'P0001';
  end;

  select * into page_row from public.pages where id = pid;
  snap := jsonb_build_object(
    'page', to_jsonb(page_row) - 'draft' - 'ical_token',
    'offers', coalesce(
      (select jsonb_agg((to_jsonb(o) - 'draft' - 'draft_status') order by o.position)
         from public.offers o where o.page_id = pid),
      '[]'::jsonb
    ),
    'site_pages', coalesce(
      (select jsonb_agg((to_jsonb(sp) - 'draft' - 'draft_status') order by sp.position)
         from public.site_pages sp where sp.page_id = pid),
      '[]'::jsonb
    )
  );
  insert into public.page_versions (page_id, version, snapshot, credits_spent)
  values (pid, next_version, snap, 5);

  return public.credit_balance(uid);
end;
$$;
