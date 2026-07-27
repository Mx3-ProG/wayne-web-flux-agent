-- Wayne Web Flux — conformité RGPD des newsletters.
-- 1. Preuve de consentement : horodatage explicite de l'inscription (accountability, art. 7).
-- 2. Droit d'opposition : jeton de désinscription en un clic, sans authentification.
-- Concerne la newsletter marketing (marketing_subscribers) ET les abonnés des
-- vitrines des utilisateurs (page_subscribers).

-- --- Colonnes de consentement / désinscription -----------------------------
alter table public.marketing_subscribers
  add column if not exists consented_at timestamptz not null default now(),
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

alter table public.page_subscribers
  add column if not exists consented_at timestamptz not null default now(),
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists marketing_subscribers_unsub_token_idx
  on public.marketing_subscribers (unsubscribe_token);
create unique index if not exists page_subscribers_unsub_token_idx
  on public.page_subscribers (unsubscribe_token);

-- --- Désinscription en un clic (lien email, non authentifié) ----------------
-- SECURITY DEFINER : contourne la RLS pour marquer la ligne correspondant au
-- jeton. Ne révèle jamais l'email ; renvoie seulement si un abonné a été trouvé.
create or replace function public.unsubscribe_by_token(token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  hit boolean := false;
begin
  update public.marketing_subscribers
    set unsubscribed_at = now()
    where unsubscribe_token = token and unsubscribed_at is null;
  if found then hit := true; end if;

  update public.page_subscribers
    set unsubscribed_at = now()
    where unsubscribe_token = token and unsubscribed_at is null;
  if found then hit := true; end if;

  -- Jeton déjà désinscrit : on considère l'opération réussie (idempotent).
  if not hit then
    if exists (select 1 from public.marketing_subscribers where unsubscribe_token = token)
       or exists (select 1 from public.page_subscribers where unsubscribe_token = token) then
      hit := true;
    end if;
  end if;

  return hit;
end;
$$;

revoke all on function public.unsubscribe_by_token(uuid) from public;
grant execute on function public.unsubscribe_by_token(uuid) to anon, authenticated;
