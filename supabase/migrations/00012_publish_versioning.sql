-- Wayne Web Flux — publication versionnée payante (vitrine + offres)
-- L'éditeur écrit dans pages.draft (overlay jsonb) ; les offres portent leurs
-- modifications en attente dans offers.draft + un statut new/deleted.
-- Publier = publish_page() : débit atomique de 5 crédits, merge des brouillons
-- vers les colonnes live, snapshot dans page_versions. La vitrine publique
-- continue de lire les colonnes live — rien ne change tant qu'on ne publie pas.

-- ------------------------------------------------------------- brouillons
alter table public.pages add column if not exists draft jsonb;

alter table public.offers add column if not exists draft jsonb;
alter table public.offers add column if not exists draft_status text
  check (draft_status in ('new', 'deleted'));

-- --------------------------------------------------- historique des versions
create table public.page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  version int not null,
  snapshot jsonb not null, -- { "page": {...}, "offers": [...] } après merge
  credits_spent int not null default 5,
  created_at timestamptz not null default now(),
  unique (page_id, version)
);
alter table public.page_versions enable row level security;
create policy "own versions read" on public.page_versions
  for select using (
    exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid())
  );
-- Aucune policy insert/update/delete : écriture uniquement via publish_page.

-- Les offres créées mais jamais publiées (draft_status = 'new') restent
-- invisibles sur la vitrine publique.
drop policy "public offers read" on public.offers;
create policy "public offers read" on public.offers
  for select using (
    active
    and draft_status is distinct from 'new'
    and exists (select 1 from public.pages p where p.id = page_id and p.published)
  );

-- ------------------------------------------------- écriture des brouillons
-- Merge jsonb côté SQL pour éviter les races de l'autosave débouncé.
create or replace function public.merge_page_draft(pid uuid, fields jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.pages
    set draft = coalesce(draft, '{}'::jsonb) || fields
    where id = pid and user_id = auth.uid();
  if not found then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.merge_offer_draft(oid uuid, fields jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.offers o
    set draft = coalesce(o.draft, '{}'::jsonb) || fields
    where o.id = oid
      and exists (select 1 from public.pages p where p.id = o.page_id and p.user_id = auth.uid());
  if not found then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
end;
$$;

-- ------------------------------------------------------------- publication
-- Tout-en-un et atomique : contrôle du solde sous le même verrou advisory que
-- spend_credits, débit de 5 crédits, merge draft → colonnes, application des
-- offres en attente, snapshot de la version. Une transaction : pas de
-- remboursement à gérer.
create or replace function public.publish_page(pid uuid)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid;
  bal int;
  next_version int;
  pending_offers int;
  page_row public.pages;
  snap jsonb;
begin
  select user_id into uid from public.pages where id = pid;
  if uid is null or uid <> auth.uid() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('credits:' || uid::text));

  select count(*) into pending_offers
    from public.offers
    where page_id = pid and (draft is not null or draft_status is not null);
  if (select draft from public.pages where id = pid) is null and pending_offers = 0 then
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
  -- « champ absent » de « champ mis à null » (logo/hero effaçables).
  update public.pages set
    business_name = case when draft ? 'business_name' then coalesce(draft->>'business_name', '') else business_name end,
    job_title     = case when draft ? 'job_title' then coalesce(draft->>'job_title', '') else job_title end,
    tagline       = case when draft ? 'tagline' then coalesce(draft->>'tagline', '') else tagline end,
    city          = case when draft ? 'city' then coalesce(draft->>'city', '') else city end,
    address       = case when draft ? 'address' then coalesce(draft->>'address', '') else address end,
    phone         = case when draft ? 'phone' then coalesce(draft->>'phone', '') else phone end,
    socials       = case when draft ? 'socials' then coalesce(draft->'socials', '{}'::jsonb) else socials end,
    colors        = case when draft ? 'colors' then coalesce(draft->'colors', '{}'::jsonb) else colors end,
    font          = case when draft ? 'font' then coalesce(draft->>'font', font) else font end,
    theme         = case when draft ? 'theme' then coalesce(draft->>'theme', theme) else theme end,
    logo_url      = case when draft ? 'logo_url' then draft->>'logo_url' else logo_url end,
    hero_url      = case when draft ? 'hero_url' then draft->>'hero_url' else hero_url end,
    gallery       = case when draft ? 'gallery' then coalesce(draft->'gallery', '[]'::jsonb) else gallery end,
    reviews       = case when draft ? 'reviews' then coalesce(draft->'reviews', '[]'::jsonb) else reviews end,
    offer         = case when draft ? 'offer' then coalesce(draft->>'offer', '') else offer end,
    hours_text    = case when draft ? 'hours_text' then coalesce(draft->>'hours_text', '') else hours_text end,
    legal         = case when draft ? 'legal' then coalesce(draft->'legal', '{}'::jsonb) else legal end,
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

  select * into page_row from public.pages where id = pid;
  snap := jsonb_build_object(
    'page', to_jsonb(page_row) - 'draft' - 'ical_token',
    'offers', coalesce(
      (select jsonb_agg((to_jsonb(o) - 'draft' - 'draft_status') order by o.position)
         from public.offers o where o.page_id = pid),
      '[]'::jsonb
    )
  );
  insert into public.page_versions (page_id, version, snapshot, credits_spent)
  values (pid, next_version, snap, 5);

  return public.credit_balance(uid);
end;
$$;
