-- Wayne Web Flux — tunnel /commencer connecté + vérification email différée.
--
-- Le tunnel crée désormais le compte AVANT de poser ses questions, et ouvre la
-- session immédiatement (admin.createUser + signInWithPassword). Conséquence :
-- auth.users.email_confirmed_at est rempli d'office et ne dit plus rien de la
-- possession réelle de l'adresse. `profiles.email_verified_at` devient la seule
-- source de vérité, alimentée par notre propre lien /auth/verifier.
--
-- `onboarding_draft` mémorise les réponses de l'écran en cours (verticale,
-- objectifs) : elles sont choisies avant l'existence de la page, donc avant tout
-- signal DB exploitable pour reprendre le tunnel.

alter table public.profiles
  add column if not exists email_verified_at timestamptz,
  add column if not exists email_verify_token_hash text,
  add column if not exists email_verify_sent_at timestamptz,
  add column if not exists onboarding_draft jsonb not null default '{}'::jsonb;

comment on column public.profiles.email_verified_at is
  'Vérification de possession de l''adresse (lien /auth/verifier). NULL = non vérifié : publication de vitrine et achats bloqués.';
comment on column public.profiles.email_verify_token_hash is
  'sha256 (hex) du jeton de vérification. Le jeton clair ne vit que dans l''email.';
comment on column public.profiles.onboarding_draft is
  'Réponses en cours du tunnel /commencer, purgées à la fin du Parcours.';

-- BACKFILL CRITIQUE : sans lui, tous les comptes existants passent à
-- email_verified_at = NULL et perdent le droit de publier dès le déploiement du
-- nouveau publish_page ci-dessous.
update public.profiles p
set email_verified_at = coalesce(u.email_confirmed_at, p.created_at)
from auth.users u
where u.id = p.user_id and p.email_verified_at is null;

create or replace function public.is_email_verified(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select email_verified_at is not null from public.profiles where user_id = uid),
    false
  );
$$;

-- has_active_access (00020) reste VOLONTAIREMENT inchangé. Y ajouter la
-- vérification email bloquerait spend_credits (00018), donc la génération de
-- contenu — qui est une étape du Parcours jouée avant que l'utilisateur ait eu
-- le temps de cliquer son lien — ainsi que les sous-pages (00021) et la
-- navigation (00022). Le gate email vit uniquement dans publish_page.
--
-- Encaisser : il n'y a pas de Stripe Connect. Les commandes clients arrivent via
-- /api/order/[slug], qui exige une vitrine published — donc gatée transitivement
-- par publish_page. Aucun garde-fou supplémentaire n'est nécessaire ici.
-- L'achat de crédits/abonnement est gaté côté TS dans /api/checkout/session.

-- publish_page : reprise INTÉGRALE de la version 00023 (typography + navigation
-- + scroll_top + site_pages + offers), avec pour SEUL ajout le contrôle
-- email_not_verified. Tout champ ajouté à PageDraftFields ou SitePageDraftFields
-- (lib/types.ts) DOIT être ajouté ici.
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

  if not public.is_email_verified(uid) then
    raise exception 'email_not_verified' using errcode = 'P0001';
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
    navigation     = case when draft ? 'navigation' then nullif(draft->'navigation', 'null'::jsonb) else navigation end,
    scroll_top     = case when draft ? 'scroll_top' then coalesce((draft->>'scroll_top')::boolean, false) else scroll_top end,
    typography     = case when draft ? 'typography' then coalesce(draft->'typography', '{}'::jsonb) else typography end,
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
