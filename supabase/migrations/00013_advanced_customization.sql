-- Wayne Web Flux — personnalisation avancée de la vitrine.
-- Nouveaux champs éditables via le brouillon (pages.draft → publish_page) :
--   sections       : liste ordonnée des sections de la page (null = ordre historique)
--   seo            : { title, description, ogImageUrl }
--   promo          : { text, code?, endsAt? } — remplace la colonne offer (texte),
--                    qui reste lue en fallback mais n'est plus écrite
--   floating_cta   : { type: 'whatsapp'|'phone', number } — bouton flottant
--   hero_video_url : vidéo en bannière (fallback hero_url)
--   hide_branding  : masque le "Créé avec Wayne Web Flux" du footer

alter table public.pages add column if not exists sections jsonb;
alter table public.pages add column if not exists seo jsonb not null default '{}'::jsonb;
alter table public.pages add column if not exists promo jsonb;
alter table public.pages add column if not exists floating_cta jsonb;
alter table public.pages add column if not exists hero_video_url text;
alter table public.pages add column if not exists hide_branding boolean not null default false;

-- Reprise du bandeau texte existant dans le nouveau format.
update public.pages
  set promo = jsonb_build_object('text', offer)
  where promo is null and offer <> '';

-- Thèmes premium.
alter table public.pages drop constraint if exists pages_theme_check;
alter table public.pages add constraint pages_theme_check
  check (theme in ('editorial', 'studio', 'local', 'bold', 'luxe', 'minimal', 'neon'));

-- publish_page : même fonction que 00012, avec les nouveaux champs dans le
-- merge draft → colonnes live. Tout champ ajouté à PageDraftFields (lib/types.ts)
-- DOIT être ajouté ici, sinon il resterait en brouillon sans jamais être publié.
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
