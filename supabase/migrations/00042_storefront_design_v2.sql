-- Moteur de vitrines V2 : le commerçant choisit l'accent et le mode. Toutes
-- les surfaces sont résolues côté application depuis le kit versionné.

alter table public.pages
  add column if not exists appearance jsonb,
  add column if not exists design_engine_version smallint not null default 2;

update public.pages
set appearance = jsonb_build_object(
  'accent', coalesce(nullif(colors->>'primary', ''), '#d31212'),
  'mode', case
    when theme in ('studio', 'luxe', 'neon', 'prestige', 'performance-gt', 'rosso-editorial')
      then 'dark'
    else 'light'
  end,
  'allowVisitorModeToggle', true
)
where appearance is null;

alter table public.pages
  alter column appearance set not null,
  alter column appearance set default '{"accent":"#d31212","mode":"light","allowVisitorModeToggle":true}'::jsonb;

create or replace function public.valid_page_appearance(value jsonb)
returns boolean
language sql immutable
as $$
  select jsonb_typeof(value) = 'object'
    and coalesce(value->>'accent', '') ~ '^#[0-9a-fA-F]{6}$'
    and value->>'mode' in ('light', 'dark')
    and jsonb_typeof(value->'allowVisitorModeToggle') = 'boolean';
$$;

alter table public.pages drop constraint if exists pages_appearance_valid;
alter table public.pages add constraint pages_appearance_valid
  check (public.valid_page_appearance(appearance));

-- `publish_page_unchecked` réinitialise le draft dans la même UPDATE. Comme
-- pour design (00025), ce trigger récupère l'apparence juste avant ce reset.
create or replace function public.publish_page_appearance_from_draft()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if old.draft is not null and old.draft ? 'appearance' and new.draft is null then
    if not public.valid_page_appearance(old.draft->'appearance') then
      raise exception 'invalid_appearance' using errcode = 'P0001';
    end if;
    new.appearance := old.draft->'appearance';
    new.design_engine_version := 2;
  end if;
  return new;
end;
$$;

drop trigger if exists pages_publish_appearance_from_draft on public.pages;
create trigger pages_publish_appearance_from_draft
before update of draft on public.pages
for each row execute function public.publish_page_appearance_from_draft();

-- Refuse également un brouillon forgé qui contournerait les Server Actions.
create or replace function public.enforce_page_draft_appearance()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if new.draft is not null and new.draft ? 'appearance'
     and not public.valid_page_appearance(new.draft->'appearance') then
    raise exception 'invalid_appearance' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists pages_draft_appearance_valid on public.pages;
create trigger pages_draft_appearance_valid
before insert or update of draft on public.pages
for each row execute function public.enforce_page_draft_appearance();

comment on column public.pages.appearance is
  'Storefront V2 merchant intent: accent, light/dark mode, optional visitor toggle.';
comment on column public.pages.design_engine_version is
  'Version of the deterministic storefront presentation resolver.';
