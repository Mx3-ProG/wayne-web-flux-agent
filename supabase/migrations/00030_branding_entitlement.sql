-- La suppression de la signature Wayne Web Flux est un droit de facturation,
-- pas une préférence d'interface. Seule la formule Entreprise à 89 €/mois,
-- avec un abonnement Stripe actif, l'accorde. Un achat de crédits, un essai
-- trialing ou un abonnement en défaut de paiement ne l'accorde pas.

create or replace function public.has_branding_entitlement(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
      select 1
      from public.profiles profile
      where profile.user_id = uid
        and profile.plan = 'entreprise'
        and profile.stripe_subscription_id is not null
        and profile.subscription_status = 'active'
    );
$$;

revoke all on function public.has_branding_entitlement(uuid) from public;

create or replace function public.can_hide_branding()
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
    and public.has_branding_entitlement(auth.uid());
$$;

revoke all on function public.can_hide_branding() from public;
grant execute on function public.can_hide_branding() to authenticated;

-- Remplace la fonction d'autosave afin qu'un appel RPC direct ne puisse pas
-- contourner le verrou affiché par l'éditeur.
create or replace function public.merge_page_draft(pid uuid, fields jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if coalesce((fields->>'hide_branding')::boolean, false)
     and not public.has_branding_entitlement(auth.uid()) then
    raise exception 'branding_payment_required' using errcode = 'P0001';
  end if;

  update public.pages
    set draft = coalesce(draft, '{}'::jsonb) || fields
    where id = pid and user_id = auth.uid();
  if not found then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
end;
$$;

-- Défense en profondeur pour les écritures directes et la publication d'un
-- ancien brouillon : une page sans droit ne peut jamais rester sans signature.
create or replace function public.enforce_branding_entitlement()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_branding_entitlement(new.user_id) then
    new.hide_branding := false;
    if new.draft is not null
       and coalesce((new.draft->>'hide_branding')::boolean, false) then
      new.draft := jsonb_set(new.draft, '{hide_branding}', 'false'::jsonb, true);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists pages_branding_entitlement on public.pages;
create trigger pages_branding_entitlement
before insert or update of hide_branding, draft on public.pages
for each row execute function public.enforce_branding_entitlement();

-- Corrige les valeurs historiques éventuellement activées lorsque l'option
-- était ouverte à tous, sans toucher aux clients ayant déjà payé.
update public.pages page
set
  hide_branding = false,
  draft = case
    when page.draft is not null and page.draft ? 'hide_branding'
      then jsonb_set(page.draft, '{hide_branding}', 'false'::jsonb, true)
    else page.draft
  end
where not public.has_branding_entitlement(page.user_id)
  and (
    page.hide_branding
    or coalesce((page.draft->>'hide_branding')::boolean, false)
  );
