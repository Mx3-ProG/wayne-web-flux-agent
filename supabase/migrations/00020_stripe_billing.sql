-- Facturation Stripe professionnelle : Stripe est l'autorité des abonnements
-- et les factures payées sont l'autorité des recharges mensuelles.

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists subscription_status text,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false;

create unique index if not exists profiles_stripe_customer_unique
  on public.profiles (stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists profiles_stripe_subscription_unique
  on public.profiles (stripe_subscription_id) where stripe_subscription_id is not null;

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  updated_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

create or replace function public.claim_stripe_event(eid text, etype text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare affected int := 0;
begin
  insert into public.stripe_webhook_events (event_id, event_type)
  values (eid, etype)
  on conflict (event_id) do nothing;
  if found then return true; end if;

  update public.stripe_webhook_events
    set status = 'processing', updated_at = now()
    where event_id = eid
      and (status = 'failed' or updated_at < now() - interval '5 minutes');
  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

revoke execute on function public.claim_stripe_event(text, text)
  from anon, authenticated;

create table if not exists public.subscription_credit_grants (
  stripe_invoice_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null,
  credits int not null check (credits > 0),
  created_at timestamptz not null default now()
);

alter table public.subscription_credit_grants enable row level security;
create policy "own subscription grants" on public.subscription_credit_grants
  for select using (auth.uid() = user_id);

create or replace function public.grant_subscription_credits(
  uid uuid, invoice_id text, billed_plan text, plan_credits int
) returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.subscription_credit_grants
    (stripe_invoice_id, user_id, plan, credits)
  values (invoice_id, uid, billed_plan, plan_credits)
  on conflict (stripe_invoice_id) do nothing;
  if not found then return false; end if;

  insert into public.credit_ledger (user_id, delta, reason)
  values (uid, plan_credits, 'invoice:' || invoice_id || ':topup:' || billed_plan);
  return true;
end;
$$;

revoke execute on function public.grant_subscription_credits(uuid, text, text, int)
  from anon, authenticated;

-- L'accès dépend désormais du véritable état Stripe. past_due garde une courte
-- grâce pendant que Stripe applique ses relances; unpaid/canceled coupent l'accès.
create or replace function public.has_active_access(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select p.trial_ends_at > now()
         or p.subscription_status in ('active', 'trialing', 'past_due')
       from public.profiles p where p.user_id = uid),
    false
  );
$$;

-- Compatibilité avec les appels existants : ne fabrique plus de recharge locale.
create or replace function public.apply_plan_topup(uid uuid)
returns int
language sql stable security definer set search_path = public
as $$ select public.credit_balance(uid); $$;
