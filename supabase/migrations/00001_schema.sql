-- Wayne Web Flux — schéma initial
-- Tables, RLS, fonctions crédits. Le solde de crédits est la somme du ledger.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  name text,
  email text,
  onboarding_step int not null default 1,
  ical_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------- pages
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  vertical text not null default 'autre',
  business_name text not null default '',
  job_title text not null default '',
  tagline text not null default '',
  city text not null default '',
  address text not null default '',
  phone text not null default '',
  socials jsonb not null default '{}'::jsonb,
  colors jsonb not null default '{}'::jsonb,
  font text not null default 'fraunces',
  logo_url text,
  hero_url text,
  gallery jsonb not null default '[]'::jsonb,
  reviews jsonb not null default '[]'::jsonb,
  offer text not null default '',
  hours_text text not null default '',
  legal jsonb not null default '{}'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index pages_one_per_user on public.pages (user_id);

-- ------------------------------------------------------ familles/prestations
create table public.service_families (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  name text not null,
  position int not null default 0
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.service_families on delete cascade,
  page_id uuid not null references public.pages on delete cascade,
  name text not null,
  duration_min int not null default 60 check (duration_min between 5 and 600),
  price_cents int not null default 0 check (price_cents >= 0),
  position int not null default 0
);

-- ----------------------------------------------------------------- horaires
-- Une ligne par (page, jour). ranges: [["09:00","12:00"],["13:30","19:00"]]
create table public.schedules (
  page_id uuid not null references public.pages on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0 = dimanche
  open boolean not null default false,
  ranges jsonb not null default '[]'::jsonb,
  primary key (page_id, weekday)
);

create table public.blocked_periods (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text not null default '',
  check (end_date >= start_date)
);

-- --------------------------------------------------------------- réservations
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  service_id uuid references public.services on delete set null,
  service_name text not null default '',
  duration_min int not null default 60,
  price_cents int not null default 0,
  date date not null,
  start_time time not null,
  first_name text not null,
  phone text not null,
  email text,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  created_at timestamptz not null default now()
);
create index bookings_page_date on public.bookings (page_id, date);

-- --------------------------------------------------------------------- CRM
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  phone text not null,
  first_name text not null default '',
  email text,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (page_id, phone)
);

-- ------------------------------------------------------------------ crédits
create table public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  delta int not null,
  reason text not null, -- signup | monthly | tool:<slug> | prefill
  created_at timestamptz not null default now()
);
create index credit_ledger_user on public.credit_ledger (user_id, created_at desc);

-- -------------------------------------------------------------- générations
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  tool_slug text not null,
  inputs jsonb not null default '{}'::jsonb,
  output text not null default '',
  credits_spent int not null default 0,
  created_at timestamptz not null default now()
);
create index generations_user on public.generations (user_id, created_at desc);

-- ------------------------------------------------------------ profil de voix
create table public.voice_profiles (
  user_id uuid primary key references auth.users on delete cascade,
  tone text not null default '',
  address_form text not null default '', -- tu | vous
  emojis text not null default '',       -- beaucoup | parfois | jamais
  specialty text not null default '',
  often_told text not null default '',
  story text not null default '',
  vals text not null default '',
  updated_at timestamptz not null default now()
);

-- ============================================================== fonctions

-- Création auto du profil + 100 crédits de bienvenue
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));
  insert into public.credit_ledger (user_id, delta, reason)
  values (new.id, 100, 'signup');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Solde = somme du ledger
create or replace function public.credit_balance(uid uuid)
returns int
language sql stable security definer set search_path = public
as $$
  select coalesce(sum(delta), 0)::int from public.credit_ledger where user_id = uid;
$$;

-- Recharge mensuelle paresseuse : +50 tous les 30 jours depuis la dernière
-- recharge (signup ou monthly), plafonnée à 100 crédits en version gratuite.
create or replace function public.apply_monthly_topup(uid uuid)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  last_recharge timestamptz;
  bal int;
  topup int;
begin
  perform pg_advisory_xact_lock(hashtext('credits:' || uid::text));
  select max(created_at) into last_recharge
    from public.credit_ledger
    where user_id = uid and reason in ('signup','monthly');
  if last_recharge is null then
    return public.credit_balance(uid);
  end if;
  while last_recharge + interval '30 days' <= now() loop
    bal := public.credit_balance(uid);
    topup := least(50, greatest(0, 100 - bal));
    last_recharge := last_recharge + interval '30 days';
    if topup > 0 then
      insert into public.credit_ledger (user_id, delta, reason, created_at)
      values (uid, topup, 'monthly', last_recharge);
    else
      -- au plafond : on note quand même la date de recharge pour repartir de là
      insert into public.credit_ledger (user_id, delta, reason, created_at)
      values (uid, 0, 'monthly', last_recharge);
    end if;
  end loop;
  return public.credit_balance(uid);
end;
$$;

-- Débit atomique : vérifie le solde sous verrou, refuse si insuffisant.
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

-- updated_at automatique sur pages
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger pages_touch before update on public.pages
  for each row execute function public.touch_updated_at();

-- ==================================================================== RLS

alter table public.profiles enable row level security;
alter table public.pages enable row level security;
alter table public.service_families enable row level security;
alter table public.services enable row level security;
alter table public.schedules enable row level security;
alter table public.blocked_periods enable row level security;
alter table public.bookings enable row level security;
alter table public.customers enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.generations enable row level security;
alter table public.voice_profiles enable row level security;

-- Propriétaire : accès complet à ses données
create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own page" on public.pages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own families" on public.service_families
  for all using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

create policy "own services" on public.services
  for all using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

create policy "own schedules" on public.schedules
  for all using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

create policy "own blocked" on public.blocked_periods
  for all using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

create policy "own bookings" on public.bookings
  for all using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

create policy "own customers" on public.customers
  for all using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

create policy "own ledger read" on public.credit_ledger
  for select using (auth.uid() = user_id);
-- Aucune policy insert/update/delete sur le ledger : uniquement via les
-- fonctions security definer (spend_credits, apply_monthly_topup, trigger).

create policy "own generations" on public.generations
  for select using (auth.uid() = user_id);

create policy "own voice" on public.voice_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Lecture publique des vitrines publiées (pour le rendu SSR anonyme)
create policy "public page read" on public.pages
  for select using (published = true);
create policy "public families read" on public.service_families
  for select using (exists (select 1 from public.pages p where p.id = page_id and p.published));
create policy "public services read" on public.services
  for select using (exists (select 1 from public.pages p where p.id = page_id and p.published));
create policy "public schedules read" on public.schedules
  for select using (exists (select 1 from public.pages p where p.id = page_id and p.published));

-- ================================================================= storage
insert into storage.buckets (id, name, public)
values ('page-photos', 'page-photos', true)
on conflict (id) do nothing;

create policy "photos owner write" on storage.objects
  for insert with check (bucket_id = 'page-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "photos owner update" on storage.objects
  for update using (bucket_id = 'page-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "photos owner delete" on storage.objects
  for delete using (bucket_id = 'page-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "photos public read" on storage.objects
  for select using (bucket_id = 'page-photos');
