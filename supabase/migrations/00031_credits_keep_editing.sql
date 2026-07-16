-- Essai expiré + crédits restants = on continue à modifier.
--
-- has_active_access (00020) ne connaissait que l'essai et l'état Stripe. Un
-- compte sans essai ni abonnement était donc coupé de TOUTE action à crédits,
-- même avec un solde payé au compteur — y compris après l'achat d'un pack,
-- record_credit_purchase (00019) ne touchant ni trial_ends_at ni
-- subscription_status. Le solde devient un motif d'accès à part entière :
-- publication, offres, produits, catégories, réservations, contexte ET
-- générations IA repassent tant qu'il reste des crédits — le crédit est la
-- seule limite. Solde à zéro → subscription_required comme avant, et l'app
-- renvoie vers /formules.
--
-- Seule porte encore fermée côté application : la fenêtre IA de 6 mois d'un
-- pack acheté (loadAccountAccess.aiAllowed puis checkFluxAccess, qui refusent
-- avant même d'appeler spend_credits).
create or replace function public.has_active_access(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select p.trial_ends_at > now()
         or p.subscription_status in ('active', 'trialing', 'past_due')
       from public.profiles p where p.user_id = uid),
    false
  ) or public.credit_balance(uid) > 0;
$$;
