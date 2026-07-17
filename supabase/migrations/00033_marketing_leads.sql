-- Wayne Web Flux — leads capturés sur la page d'accueil marketing
-- (bloc newsletter + formulaire contact). Écriture uniquement via les
-- routes /api/marketing/* (client admin) ; aucune policy publique.
-- "if not exists" : les tables ont été créées à la main dans le
-- dashboard avant cette migration ; elle documente et fiabilise l'état.

create table if not exists public.marketing_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source text not null default 'landing',
  created_at timestamptz not null default now()
);

alter table public.marketing_subscribers enable row level security;

create table if not exists public.marketing_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.marketing_messages enable row level security;
