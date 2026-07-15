-- Administration FLUX : RBAC, audit, sessions, modération et observabilité IA.

-- ------------------------------------------------------------------- profils
alter table public.profiles
  add column if not exists last_login_at timestamptz;

update public.profiles p
set last_login_at = u.last_sign_in_at
from auth.users u
where u.id = p.user_id and p.last_login_at is null;

-- --------------------------------------------------------------------- rôles
create table public.admin_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'superadmin')),
  permissions text[] not null default '{}',
  status text not null default 'active' check (status in ('pending', 'active', 'suspended')),
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  activated_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'superadmin')),
  permissions text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index admin_invitations_email_idx on public.admin_invitations(lower(email), created_at desc);

-- Les deux fondateurs demandés sont superadmins dès que leur compte existe.
insert into public.admin_memberships (user_id, role, permissions, status, activated_at)
select id, 'superadmin', '{}', 'active', now()
from auth.users
where lower(email) in ('deffontainesmathieu@gmail.com', 'thomasdufeal@gmail.com')
on conflict (user_id) do update
set role = 'superadmin', status = 'active', updated_at = now();

create or replace function public.bootstrap_flux_superadmin()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if lower(coalesce(new.email, '')) in (
    'deffontainesmathieu@gmail.com',
    'thomasdufeal@gmail.com'
  ) then
    insert into public.admin_memberships (user_id, role, status, activated_at)
    values (new.id, 'superadmin', 'active', now())
    on conflict (user_id) do update
    set role = 'superadmin', status = 'active', updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_bootstrap_flux_superadmin on auth.users;
create trigger on_auth_user_bootstrap_flux_superadmin
  after insert or update of email on auth.users
  for each row execute function public.bootstrap_flux_superadmin();

-- --------------------------------------------------------------------- audit
create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  reason text,
  before_data jsonb,
  after_data jsonb,
  ip_prefix text,
  created_at timestamptz not null default now()
);
create index admin_audit_created_idx on public.admin_audit_logs(created_at desc);
create index admin_audit_actor_idx on public.admin_audit_logs(actor_id, created_at desc);

create or replace function public.prevent_admin_audit_mutation()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE'
     and old.created_at < now() - interval '36 months'
     and current_user in ('postgres', 'supabase_admin') then
    return old;
  end if;
  raise exception 'admin_audit_logs_are_immutable';
end;
$$;
create trigger admin_audit_immutable
  before update or delete on public.admin_audit_logs
  for each row execute function public.prevent_admin_audit_mutation();

create table public.activity_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  page_id uuid references public.pages(id) on delete set null,
  kind text not null,
  source text not null default 'app',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index activity_events_created_idx on public.activity_events(created_at desc);
create index activity_events_user_idx on public.activity_events(user_id, created_at desc);

-- ------------------------------------------------------------------ sessions
create table public.user_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  authenticated_seconds int not null default 0 check (authenticated_seconds >= 0),
  active_seconds int not null default 0 check (active_seconds >= 0),
  explicit_logout boolean not null default false,
  user_agent text
);
create index user_sessions_user_idx on public.user_sessions(user_id, started_at desc);

-- -------------------------------------------------------------- usage de l'IA
create table public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  page_id uuid references public.pages(id) on delete set null,
  provider text not null default 'anthropic',
  model text not null,
  operation text not null,
  input_tokens int not null default 0 check (input_tokens >= 0),
  output_tokens int not null default 0 check (output_tokens >= 0),
  cache_creation_tokens int not null default 0 check (cache_creation_tokens >= 0),
  cache_read_tokens int not null default 0 check (cache_read_tokens >= 0),
  latency_ms int check (latency_ms is null or latency_ms >= 0),
  outcome text not null check (outcome in ('success', 'blocked', 'error')),
  error_code text,
  raw_usage jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index ai_usage_created_idx on public.ai_usage_events(created_at desc);
create index ai_usage_user_idx on public.ai_usage_events(user_id, created_at desc);

alter table public.generations
  add column if not exists ai_usage_event_id uuid references public.ai_usage_events(id) on delete set null;

create table public.generation_reviews (
  generation_id uuid primary key references public.generations(id) on delete cascade,
  status text not null check (status in ('approved', 'rejected')),
  score int check (score between 1 and 5),
  tags text[] not null default '{}',
  note text,
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  reviewed_at timestamptz not null default now()
);
create index generation_reviews_reviewer_idx on public.generation_reviews(reviewed_by, reviewed_at desc);

alter table public.karlmada_events
  add column if not exists review_status text check (review_status in ('reviewed', 'dismissed')),
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;

-- --------------------------------------------------------- modération boutiques
alter table public.pages
  add column if not exists moderation_status text not null default 'unverified'
    check (moderation_status in ('unverified', 'verified', 'archived')),
  add column if not exists verified_by uuid references auth.users(id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_version int,
  add column if not exists archived_by uuid references auth.users(id) on delete set null,
  add column if not exists archived_at timestamptz,
  add column if not exists archive_reason text,
  add column if not exists moderation_was_published boolean;

create or replace function public.protect_page_moderation_fields()
returns trigger language plpgsql as $$
begin
  if (
    new.moderation_status is distinct from old.moderation_status
    or new.verified_by is distinct from old.verified_by
    or new.verified_at is distinct from old.verified_at
    or new.verified_version is distinct from old.verified_version
    or new.archived_by is distinct from old.archived_by
    or new.archived_at is distinct from old.archived_at
    or new.archive_reason is distinct from old.archive_reason
    or new.moderation_was_published is distinct from old.moderation_was_published
  ) and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception 'moderation_fields_are_server_managed' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger pages_protect_moderation_fields
before update on public.pages
for each row execute function public.protect_page_moderation_fields();

-- Encapsule la fonction historique pour bloquer une publication archivée et
-- invalider le badge dès qu'une nouvelle version est publiée.
do $$
begin
  if to_regprocedure('public.publish_page_unchecked(uuid)') is null then
    alter function public.publish_page(uuid) rename to publish_page_unchecked;
  end if;
end;
$$;

revoke execute on function public.publish_page_unchecked(uuid) from public, anon, authenticated;

create or replace function public.publish_page(pid uuid)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  result int;
begin
  if exists (
    select 1 from public.pages
    where id = pid and moderation_status = 'archived'
  ) then
    raise exception 'page_archived' using errcode = 'P0001';
  end if;

  result := public.publish_page_unchecked(pid);

  update public.pages
  set moderation_status = 'unverified',
      verified_by = null,
      verified_at = null,
      verified_version = null
  where id = pid;

  return result;
end;
$$;
grant execute on function public.publish_page(uuid) to authenticated;

-- ----------------------------------------------------------- helpers serveur
create or replace function public.admin_has_permission(actor uuid, required_permission text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.admin_memberships m
    where m.user_id = actor
      and m.status = 'active'
      and (m.role = 'superadmin' or required_permission = any(m.permissions))
  );
$$;

create or replace function public.admin_adjust_credit(
  actor uuid,
  target_user uuid,
  target_balance int,
  adjustment_reason text
)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  current_balance int;
  delta_value int;
begin
  if not public.admin_has_permission(actor, 'credits.manage') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if target_balance < 0 or length(trim(adjustment_reason)) < 3 then
    raise exception 'invalid_adjustment' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('credits:' || target_user::text));
  current_balance := public.credit_balance(target_user);
  delta_value := target_balance - current_balance;
  if delta_value <> 0 then
    insert into public.credit_ledger (user_id, delta, reason)
    values (target_user, delta_value, 'admin_adjustment:' || left(trim(adjustment_reason), 160));
  end if;

  insert into public.admin_audit_logs
    (actor_id, action, target_type, target_id, reason, before_data, after_data)
  values (
    actor, 'credits.adjust', 'user', target_user::text, trim(adjustment_reason),
    jsonb_build_object('balance', current_balance),
    jsonb_build_object('balance', target_balance, 'delta', delta_value)
  );
  return target_balance;
end;
$$;

create or replace function public.admin_moderate_page(
  actor uuid,
  target_page uuid,
  next_status text,
  moderation_reason text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  previous public.pages;
  current_version int;
begin
  if not public.admin_has_permission(actor, 'sites.moderate') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if next_status not in ('unverified', 'verified', 'archived') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  if next_status = 'archived' and length(trim(coalesce(moderation_reason, ''))) < 3 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;

  select * into previous from public.pages where id = target_page for update;
  if previous.id is null then raise exception 'page_not_found'; end if;

  if next_status = 'archived' then
    update public.pages set
      moderation_status = 'archived',
      moderation_was_published = published,
      published = false,
      archived_by = actor,
      archived_at = now(),
      archive_reason = trim(moderation_reason),
      verified_by = null,
      verified_at = null,
      verified_version = null
    where id = target_page;
  elsif next_status = 'verified' then
    if not previous.published then raise exception 'page_not_published'; end if;
    select coalesce(max(version), 0) into current_version
    from public.page_versions where page_id = target_page;
    update public.pages set
      moderation_status = 'verified',
      verified_by = actor,
      verified_at = now(),
      verified_version = current_version,
      archived_by = null,
      archived_at = null,
      archive_reason = null
    where id = target_page;
  else
    update public.pages set
      moderation_status = 'unverified',
      published = case
        when previous.moderation_status = 'archived'
          then coalesce(previous.moderation_was_published, false)
        else published
      end,
      verified_by = null,
      verified_at = null,
      verified_version = null,
      archived_by = null,
      archived_at = null,
      archive_reason = null,
      moderation_was_published = null
    where id = target_page;
  end if;

  insert into public.admin_audit_logs
    (actor_id, action, target_type, target_id, reason, before_data, after_data)
  values (
    actor, 'site.' || next_status, 'page', target_page::text, moderation_reason,
    jsonb_build_object('status', previous.moderation_status, 'published', previous.published),
    jsonb_build_object('status', next_status)
  );
end;
$$;

create or replace function public.admin_list_users(
  actor uuid,
  search_text text default '',
  row_offset int default 0,
  row_limit int default 50
)
returns table(
  total_count bigint,
  user_id uuid,
  name text,
  email text,
  phone text,
  business_email text,
  siret text,
  company_name text,
  plan text,
  subscription_status text,
  created_at timestamptz,
  last_login_at timestamptz,
  project_count bigint,
  page_count bigint,
  contact_count bigint,
  credit_balance bigint,
  ai_input_tokens bigint,
  ai_output_tokens bigint,
  authenticated_seconds bigint,
  active_seconds bigint
)
language sql stable security definer set search_path = public
as $$
  with filtered as (
    select p.*, coalesce(p.email, u.email) as resolved_email,
           coalesce(p.last_login_at, u.last_sign_in_at) as resolved_last_login
    from public.profiles p
    join auth.users u on u.id = p.user_id
    where public.admin_has_permission(actor, 'users.read')
      and (
        trim(search_text) = ''
        or p.user_id::text ilike '%' || trim(search_text) || '%'
        or coalesce(p.name, '') ilike '%' || trim(search_text) || '%'
        or coalesce(p.email, u.email, '') ilike '%' || trim(search_text) || '%'
        or coalesce(p.business_email, '') ilike '%' || trim(search_text) || '%'
        or coalesce(p.phone, '') ilike '%' || trim(search_text) || '%'
        or coalesce(p.siret, '') ilike '%' || trim(search_text) || '%'
      )
  ), contacts as (
    select distinct p.user_id, source.page_id, source.contact_key
    from public.pages p
    join (
      select page_id, coalesce(
        nullif('p:' || regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 'p:'),
        nullif('e:' || lower(trim(coalesce(email, ''))), 'e:')
      ) as contact_key from public.customers
      union all
      select page_id, coalesce(
        nullif('p:' || regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 'p:'),
        nullif('e:' || lower(trim(coalesce(email, ''))), 'e:')
      ) from public.bookings
      union all
      select page_id, nullif('e:' || lower(trim(email)), 'e:') from public.page_subscribers
      union all
      select page_id, coalesce(
        nullif('p:' || regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 'p:'),
        nullif('e:' || lower(trim(coalesce(email, ''))), 'e:')
      ) from public.orders
    ) source on source.page_id = p.id
    where source.contact_key is not null
  )
  select
    count(*) over() as total_count,
    f.user_id,
    f.name,
    f.resolved_email as email,
    f.phone,
    f.business_email,
    f.siret,
    f.company_name,
    f.plan,
    f.subscription_status,
    f.created_at,
    f.resolved_last_login as last_login_at,
    (select count(*) from public.pages p where p.user_id = f.user_id) as project_count,
    (select count(*) from public.pages p where p.user_id = f.user_id)
      + (select count(*) from public.site_pages sp join public.pages p on p.id = sp.page_id where p.user_id = f.user_id)
      as page_count,
    (select count(*) from contacts c where c.user_id = f.user_id) as contact_count,
    (select coalesce(sum(cl.delta), 0) from public.credit_ledger cl where cl.user_id = f.user_id) as credit_balance,
    (select coalesce(sum(a.input_tokens), 0) from public.ai_usage_events a where a.user_id = f.user_id) as ai_input_tokens,
    (select coalesce(sum(a.output_tokens), 0) from public.ai_usage_events a where a.user_id = f.user_id) as ai_output_tokens,
    (select coalesce(sum(s.authenticated_seconds), 0) from public.user_sessions s where s.user_id = f.user_id) as authenticated_seconds,
    (select coalesce(sum(s.active_seconds), 0) from public.user_sessions s where s.user_id = f.user_id) as active_seconds
  from filtered f
  order by f.created_at desc
  offset greatest(row_offset, 0)
  limit least(greatest(row_limit, 1), 100);
$$;

create or replace function public.purge_admin_telemetry()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.user_sessions where started_at < now() - interval '13 months';
  delete from public.activity_events where created_at < now() - interval '13 months';
  delete from public.ai_usage_events where created_at < now() - interval '13 months';
  delete from public.admin_audit_logs where created_at < now() - interval '36 months';
end;
$$;

-- --------------------------------------------------------------- protections
alter table public.admin_memberships enable row level security;
alter table public.admin_invitations enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.activity_events enable row level security;
alter table public.user_sessions enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.generation_reviews enable row level security;

-- Aucun accès navigateur aux tables globales : le serveur autorisé utilise
-- exclusivement le service role après vérification du rôle et de la MFA.
revoke all on public.admin_memberships from anon, authenticated;
revoke all on public.admin_invitations from anon, authenticated;
revoke all on public.admin_audit_logs from anon, authenticated;
revoke all on public.activity_events from anon, authenticated;
revoke all on public.user_sessions from anon, authenticated;
revoke all on public.ai_usage_events from anon, authenticated;
revoke all on public.generation_reviews from anon, authenticated;
revoke execute on function public.admin_adjust_credit(uuid, uuid, int, text) from public, anon, authenticated;
revoke execute on function public.admin_moderate_page(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.admin_list_users(uuid, text, int, int) from public, anon, authenticated;
revoke execute on function public.purge_admin_telemetry() from public, anon, authenticated;
