-- Presets visuels Wayne Glass pour les vitrines existantes et futures.
alter table public.pages
  add column if not exists theme text not null default 'editorial'
  check (theme in ('editorial', 'studio', 'local', 'bold'));

comment on column public.pages.theme is
  'Preset Wayne Glass; colors and font remain merchant overrides.';
