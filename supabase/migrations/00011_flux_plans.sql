-- Wayne Web Flux — formules FLUX (Gratuit / Pro / Business / Entreprise)
-- Le gratuit ne recharge plus : 100 crédits une seule fois à l'inscription.
-- Les formules payantes rechargent tous les 30 jours (additif, sans plafond) :
-- pro 500, business 1500, entreprise 5000. La bascule de plan se fait en SQL
-- (admin) en attendant Stripe.

alter table public.profiles drop constraint if exists profiles_plan_check;
update public.profiles set plan = 'pro' where plan = 'plus';
alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free', 'pro', 'business', 'entreprise'));

-- Recharge paresseuse selon la formule, remplace apply_monthly_topup.
-- Ancrée sur le dernier mouvement `topup:<plan>` : un changement de formule
-- déclenche une allocation immédiate au premier passage.
create or replace function public.apply_plan_topup(uid uuid)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  user_plan text;
  allowance int;
  anchor timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('credits:' || uid::text));
  select plan into user_plan from public.profiles where user_id = uid;
  allowance := case user_plan
    when 'pro' then 500
    when 'business' then 1500
    when 'entreprise' then 5000
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

drop function if exists public.apply_monthly_topup(uuid);
