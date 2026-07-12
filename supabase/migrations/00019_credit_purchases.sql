-- Achats de packs de crédits via Stripe Checkout.
-- Une ligne par session Checkout payée ; l'unicité de stripe_session_id rend
-- le crédit idempotent face aux retries du webhook Stripe.

create table public.credit_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_session_id text not null unique,
  pack_id text not null,
  credits int not null,
  amount_cents int not null,
  created_at timestamptz not null default now()
);

alter table public.credit_purchases enable row level security;

create policy "own purchases" on public.credit_purchases
  for select using (auth.uid() = user_id);

-- Crédit atomique + idempotent, appelé par le webhook (service role
-- uniquement). Retourne false si la session a déjà été traitée.
create or replace function public.grant_credit_purchase(
  uid uuid,
  session_id text,
  pack text,
  pack_credits int,
  amount int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.credit_purchases (user_id, stripe_session_id, pack_id, credits, amount_cents)
  values (uid, session_id, pack, pack_credits, amount)
  on conflict (stripe_session_id) do nothing;
  if not found then
    return false; -- retry Stripe : déjà crédité
  end if;

  insert into public.credit_ledger (user_id, delta, reason)
  values (uid, pack_credits, 'purchase:' || pack);
  return true;
end;
$$;

revoke execute on function public.grant_credit_purchase(uuid, text, text, int, int)
  from anon, authenticated;
