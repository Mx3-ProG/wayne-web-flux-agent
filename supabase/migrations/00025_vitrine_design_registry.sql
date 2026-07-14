-- Registre de conception composable des vitrines.
-- `design` reste nullable : NULL signifie « résoudre depuis theme », ce qui
-- garantit le rendu historique sans backfill.
alter table public.pages
  add column if not exists design jsonb null;

comment on column public.pages.design is
  'Sélection du registre vitrine : {kitId, components?, voiceArchetypeId?}. NULL = fallback theme.';

-- publish_page réinitialise draft pendant son UPDATE. Ce trigger récupère la
-- sélection design juste avant ce reset, sans dupliquer la longue fonction de
-- publication et ses évolutions.
create or replace function public.publish_page_design_from_draft()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.draft is not null and old.draft ? 'design' and new.draft is null then
    new.design := nullif(old.draft->'design', 'null'::jsonb);
  end if;
  return new;
end;
$$;

drop trigger if exists pages_publish_design_from_draft on public.pages;
create trigger pages_publish_design_from_draft
before update on public.pages
for each row execute function public.publish_page_design_from_draft();
