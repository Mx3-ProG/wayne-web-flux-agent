-- Horodatage serveur du dernier dialogue d'incitation affiché à l'utilisateur.
-- La fréquence est calculée côté application (12 h) et persiste entre appareils.
alter table public.profiles
  add column if not exists upsell_last_shown_at timestamptz;
