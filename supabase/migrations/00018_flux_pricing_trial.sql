-- Wayne Web Flux — nouvelle grille FLUX + essai 7 jours
-- Le palier gratuit disparaît : 4 formules payantes (basique 9 €/100 cr.,
-- pro 29 €/500, business 69 €/1500, entreprise 89 €/3000) avec un essai de
-- 7 jours automatique à l'inscription (les 100 crédits de bienvenue servent
-- de carburant d'essai). Essai expiré sans souscription = lecture seule :
-- le site reste en ligne mais toute action à crédits est bloquée.
-- Souscription manuelle (admin) en attendant Stripe :
--   UPDATE profiles SET subscribed_at = now(), plan = 'pro' WHERE ...;

alter table public.profiles drop constraint if exists profiles_plan_check;
update public.profiles set plan = 'basique' where plan = 'free';
alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('basique', 'pro', 'business', 'entreprise'));
alter table public.profiles alter column plan set default 'basique';

-- Le default backfille les comptes existants : 7 jours de grâce pour tous.
alter table public.profiles
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '7 days');
alter table public.profiles
  add column if not exists subscribed_at timestamptz;

-- Accès actif = essai en cours OU souscription enregistrée.
create or replace function public.has_active_access(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select p.trial_ends_at > now() or p.subscribed_at is not null
       from public.profiles p where p.user_id = uid),
    false
  );
$$;

-- Recharge mensuelle : uniquement pour les comptes souscrits (l'essai de 7 j
-- vit sur les crédits de bienvenue, 7 j < 30 j donc jamais de topup d'essai).
create or replace function public.apply_plan_topup(uid uuid)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  user_plan text;
  is_subscribed boolean;
  allowance int;
  anchor timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('credits:' || uid::text));
  select plan, subscribed_at is not null into user_plan, is_subscribed
    from public.profiles where user_id = uid;
  if not coalesce(is_subscribed, false) then
    return public.credit_balance(uid);
  end if;
  allowance := case user_plan
    when 'basique' then 100
    when 'pro' then 500
    when 'business' then 1500
    when 'entreprise' then 3000
    else 0
  end;
  if allowance = 0 then
    return public.credit_balance(uid);
  end if;
  select max(created_at) into anchor
    from public.credit_ledger
    where user_id = uid and reason = 'topup:' || user_plan;
  if anchor is null then
    insert into public.credit_ledger (user_id, delta, reason)
    values (uid, allowance, 'topup:' || user_plan);
    return public.credit_balance(uid);
  end if;
  while anchor + interval '30 days' <= now() loop
    anchor := anchor + interval '30 days';
    insert into public.credit_ledger (user_id, delta, reason, created_at)
    values (uid, allowance, 'topup:' || user_plan, anchor);
  end loop;
  return public.credit_balance(uid);
end;
$$;

-- Garde-fou lecture seule : la vérification d'accès prime sur le solde.
create or replace function public.spend_credits(uid uuid, cost int, why text)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  bal int;
begin
  if cost <= 0 then
    raise exception 'invalid cost';
  end if;
  if not public.has_active_access(uid) then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('credits:' || uid::text));
  bal := public.credit_balance(uid);
  if bal < cost then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;
  insert into public.credit_ledger (user_id, delta, reason)
  values (uid, -cost, why);
  return bal - cost;
end;
$$;

-- publish_page : reprise INTÉGRALE de la version 00013_advanced_customization
-- (sections/seo/promo/floating_cta/hero_video_url/hide_branding inclus dans le
-- merge), avec en plus le garde-fou d'accès AVANT le contrôle du solde.
-- Tout champ ajouté à PageDraftFields (lib/types.ts) DOIT être ajouté ici.
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

  if not public.has_active_access(uid) then
    raise exception 'subscription_required' using errcode = 'P0001';
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
