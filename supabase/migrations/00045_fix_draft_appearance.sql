-- Correction du blocage de publication causé par la migration 00042.
--
-- Contexte : 00042 a introduit deux triggers qui valident le champ appearance
-- dans les brouillons. Le trigger de publication (pages_publish_appearance_from_draft)
-- et le trigger d'écriture (pages_draft_appearance_valid) rejetaient les brouillons
-- dont appearance existait mais manquait allowVisitorModeToggle — un champ introduit
-- dans la même migration. Les brouillons écrits pendant la fenêtre transitoire ou
-- par une ancienne version du code étaient donc indéfiniment bloqués.
--
-- Correctifs :
-- 1. Rendre les deux triggers résilients : auto-compléter allowVisitorModeToggle
--    (valeur par défaut : true) au lieu de lever une exception.
-- 2. Backfill de tous les brouillons existants invalides.

-- 1a. Trigger de publication : auto-compléter allowVisitorModeToggle si absent/non-booléen.
create or replace function public.publish_page_appearance_from_draft()
returns trigger
language plpgsql set search_path = public
as $$
declare
  raw_appearance jsonb;
begin
  if old.draft is not null and old.draft ? 'appearance' and new.draft is null then
    raw_appearance := old.draft->'appearance';
    -- Auto-fix : allowVisitorModeToggle manquant ou non-booléen → true par défaut.
    if jsonb_typeof(raw_appearance->'allowVisitorModeToggle') is distinct from 'boolean' then
      raw_appearance := raw_appearance || '{"allowVisitorModeToggle": true}'::jsonb;
    end if;
    if not public.valid_page_appearance(raw_appearance) then
      raise exception 'invalid_appearance' using errcode = 'P0001';
    end if;
    new.appearance := raw_appearance;
    new.design_engine_version := 2;
  end if;
  return new;
end;
$$;

-- 1b. Trigger d'écriture de brouillon : auto-compléter plutôt que rejeter.
create or replace function public.enforce_page_draft_appearance()
returns trigger
language plpgsql set search_path = public
as $$
declare
  app jsonb;
begin
  if new.draft is not null and new.draft ? 'appearance' then
    app := new.draft->'appearance';
    -- Auto-fix : allowVisitorModeToggle manquant ou non-booléen → true par défaut.
    if jsonb_typeof(app->'allowVisitorModeToggle') is distinct from 'boolean' then
      app := app || '{"allowVisitorModeToggle": true}'::jsonb;
      new.draft := jsonb_set(new.draft, '{appearance}', app);
    end if;
    if not public.valid_page_appearance(new.draft->'appearance') then
      raise exception 'invalid_appearance' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

-- 2. Backfill : corriger les brouillons existants avec appearance invalide.
--    Le trigger enforce_page_draft_appearance (maintenant résilient) est actif
--    durant cette UPDATE et verra les données déjà corrigées.
update public.pages
set draft = jsonb_set(
  draft,
  '{appearance}',
  (draft->'appearance') || '{"allowVisitorModeToggle": true}'::jsonb
)
where draft is not null
  and draft ? 'appearance'
  and jsonb_typeof(draft->'appearance'->'allowVisitorModeToggle') is distinct from 'boolean';
