-- Nouveau kit vitrine « Maison Couture ».

alter table public.pages drop constraint if exists pages_theme_check;
alter table public.pages add constraint pages_theme_check
  check (theme in (
    'editorial', 'studio', 'local', 'bold', 'luxe', 'minimal', 'neon',
    'prestige', 'performance-gt', 'rosso-editorial', 'maison-couture'
  ));
