-- Validation obligatoire des rendez-vous : une demande client arrive en
-- 'pending' ; la commerçante l'accepte ('confirmed') ou la refuse ('refused').
-- Les rdv créés côté commerçant restent 'confirmed' (défaut inchangé).

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'refused', 'cancelled'));
