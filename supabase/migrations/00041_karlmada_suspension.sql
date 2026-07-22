-- Suspension réversible des comptes au lieu d'une suppression irréversible.
-- KarlMada n'efface plus jamais un compte : au seuil de blocages sur une
-- fenêtre glissante, le compte est suspendu (IA + publication coupées) et
-- l'équipe habilitée tranche depuis l'administration (réactivation possible).
alter table public.profiles
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text;

comment on column public.profiles.suspended_at is
  'Non nul = compte suspendu (IA et publication bloquées). Réversible par un admin.';
comment on column public.profiles.suspended_reason is
  'Motif interne de la suspension (ex. seuil KarlMada atteint).';
