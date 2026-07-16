-- Centre de notifications fiable, multi-appareils et Web Push.

-- ---------------------------------------------------------------- notifications
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('order', 'booking', 'newsletter_signup', 'daily_views'));

alter table public.notifications
  add column if not exists action_url text not null default '/notifications',
  add column if not exists dedupe_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists notifications_dedupe_key
  on public.notifications (dedupe_key)
  where dedupe_key is not null;

-- ---------------------------------------------------------------- preferences
create table public.notification_preferences (
  user_id uuid primary key references auth.users on delete cascade,
  orders_enabled boolean not null default true,
  bookings_enabled boolean not null default true,
  newsletter_enabled boolean not null default true,
  daily_views_enabled boolean not null default true,
  daily_views_time time not null default '18:00',
  timezone text not null default 'Europe/Paris',
  last_daily_views_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
create policy "own notification preferences" on public.notification_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------------ devices
-- endpoint et clés sont des secrets techniques. L'UI passe par des routes
-- serveur qui ne renvoient que les métadonnées de l'appareil.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_name text not null default 'Appareil',
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  disabled_at timestamptz
);

create index push_subscriptions_user_active
  on public.push_subscriptions (user_id, disabled_at, created_at desc);

alter table public.push_subscriptions enable row level security;
-- Aucune policy volontairement : seul le client service-role des routes
-- serveur lit les endpoints et clés.

-- --------------------------------------------------------------- deliveries
create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications on delete cascade,
  subscription_id uuid not null references public.push_subscriptions on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'retrying', 'failed')),
  attempts int not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, subscription_id)
);

create index notification_deliveries_due
  on public.notification_deliveries (status, next_attempt_at)
  where status in ('pending', 'retrying', 'sending');

alter table public.notification_deliveries enable row level security;
create policy "own notification deliveries" on public.notification_deliveries
  for select using (exists (
    select 1 from public.notifications n
    where n.id = notification_id and n.user_id = auth.uid()
  ));

-- Une notification durable crée immédiatement une livraison pour chaque
-- appareil actif lorsque la catégorie correspondante est autorisée.
create or replace function public.fan_out_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.user_id)
  on conflict (user_id) do nothing;

  insert into public.notification_deliveries (notification_id, subscription_id)
  select new.id, subscription.id
  from public.push_subscriptions subscription
  join public.notification_preferences preference on preference.user_id = new.user_id
  where subscription.user_id = new.user_id
    and subscription.disabled_at is null
    and case new.type
      when 'order' then preference.orders_enabled
      when 'booking' then preference.bookings_enabled
      when 'newsletter_signup' then preference.newsletter_enabled
      when 'daily_views' then preference.daily_views_enabled
      else false
    end
  on conflict (notification_id, subscription_id) do nothing;

  return new;
end;
$$;

drop trigger if exists notifications_fan_out on public.notifications;
create trigger notifications_fan_out
after insert on public.notifications
for each row execute function public.fan_out_notification();

-- ----------------------------------------------------------------- events
create or replace function public.notify_order_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  shop_name text;
begin
  if new.total_cents <= 0 then return new; end if;
  select user_id, coalesce(nullif(business_name, ''), 'Ma boutique')
    into owner_id, shop_name from public.pages where id = new.page_id;

  insert into public.notifications (
    user_id, page_id, type, ref_id, title, body, action_url, dedupe_key, metadata
  ) values (
    owner_id,
    new.page_id,
    'order',
    new.id,
    'Nouvelle commande · ' || shop_name,
    'Montant : ' || to_char(new.total_cents / 100.0, 'FM999999990D00') || ' €',
    '/commandes?order=' || new.id::text,
    'order:' || new.id::text,
    jsonb_build_object('order_id', new.id, 'total_cents', new.total_cents)
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  return new;
end;
$$;

drop trigger if exists order_created_notification on public.orders;
create trigger order_created_notification
after insert or update of total_cents on public.orders
for each row execute function public.notify_order_created();

create or replace function public.notify_booking_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  shop_name text;
begin
  select user_id, coalesce(nullif(business_name, ''), 'Ma boutique')
    into owner_id, shop_name from public.pages where id = new.page_id;

  insert into public.notifications (
    user_id, page_id, type, ref_id, title, body, action_url, dedupe_key, metadata
  ) values (
    owner_id,
    new.page_id,
    'booking',
    new.id,
    'Nouvelle réservation · ' || shop_name,
    new.service_name || ' · ' || to_char(new.date, 'DD/MM/YYYY') || ' à ' || to_char(new.start_time, 'HH24:MI'),
    '/agenda?view=agenda&booking=' || new.id::text || '&date=' || new.date::text,
    'booking:' || new.id::text,
    jsonb_build_object('booking_id', new.id, 'date', new.date, 'start_time', new.start_time)
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  return new;
end;
$$;

drop trigger if exists booking_created_notification on public.bookings;
create trigger booking_created_notification
after insert on public.bookings
for each row execute function public.notify_booking_created();

create or replace function public.notify_newsletter_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  shop_name text;
begin
  select user_id, coalesce(nullif(business_name, ''), 'Ma boutique')
    into owner_id, shop_name from public.pages where id = new.page_id;

  insert into public.notifications (
    user_id, page_id, type, ref_id, title, body, action_url, dedupe_key, metadata
  ) values (
    owner_id,
    new.page_id,
    'newsletter_signup',
    new.id,
    'Nouvel abonné · ' || shop_name,
    'Une personne vient de rejoindre votre newsletter.',
    '/statistiques?view=stats#subscribers',
    'newsletter:' || new.id::text,
    jsonb_build_object('subscriber_id', new.id)
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  return new;
end;
$$;

drop trigger if exists newsletter_signup_notification on public.page_subscribers;
create trigger newsletter_signup_notification
after insert on public.page_subscribers
for each row execute function public.notify_newsletter_signup();

-- ----------------------------------------------------------- atomic claiming
-- Les workers reprennent aussi une livraison restée en `sending` plus de deux
-- minutes (fonction interrompue, timeout ou déploiement).
create or replace function public.claim_notification_deliveries(batch_size int default 100)
returns table (
  delivery_id uuid,
  notification_id uuid,
  subscription_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  title text,
  body text,
  action_url text,
  notification_type text,
  badge_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with due as (
    select d.id
    from public.notification_deliveries d
    join public.push_subscriptions s on s.id = d.subscription_id
    join public.notifications n on n.id = d.notification_id and n.user_id = s.user_id
    where s.disabled_at is null
      and (
        (d.status in ('pending', 'retrying') and d.next_attempt_at <= now())
        or (d.status = 'sending' and d.claimed_at < now() - interval '2 minutes')
      )
    order by d.next_attempt_at, d.created_at
    limit greatest(1, least(batch_size, 500))
    for update of d skip locked
  ), claimed as (
    update public.notification_deliveries d
    set status = 'sending', attempts = attempts + 1, claimed_at = now(), updated_at = now()
    from due
    where d.id = due.id
    returning d.*
  )
  select
    claimed.id,
    claimed.notification_id,
    claimed.subscription_id,
    subscription.endpoint,
    subscription.p256dh,
    subscription.auth,
    notification.title,
    notification.body,
    '/notifications/open/' || notification.id::text,
    notification.type,
    (select count(*) from public.notifications unread
      where unread.user_id = notification.user_id and unread.read = false)
  from claimed
  join public.push_subscriptions subscription on subscription.id = claimed.subscription_id
  join public.notifications notification on notification.id = claimed.notification_id;
end;
$$;

revoke all on function public.claim_notification_deliveries(int) from public, anon, authenticated;
grant execute on function public.claim_notification_deliveries(int) to service_role;