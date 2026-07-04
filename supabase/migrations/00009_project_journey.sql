-- Les étapes manuelles du parcours sont propres à chaque projet.
alter table public.pages
  add column if not exists journey_completed_steps int[] not null default '{}';
