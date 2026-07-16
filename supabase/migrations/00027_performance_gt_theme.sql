-- Nouveau kit vitrine « Performance GT ».
-- Le rendu et le registre utilisent l'identifiant stable performance-gt.

alter table public.pages drop constraint if exists pages_theme_check;
alter table public.pages add constraint pages_theme_check
  check (theme in (
    'editorial', 'studio', 'local', 'bold', 'luxe', 'minimal', 'neon',
    'prestige', 'performance-gt'
  ));
