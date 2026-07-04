-- Wayne Web Flux — multi-projets (multi-boutiques) + nom de domaine (Phase 5)
-- Un utilisateur peut désormais avoir plusieurs pages (projets). On introduit
-- un « projet actif » (profiles.active_page_id) et on re-scope la voix IA et
-- les contenus par projet. Les crédits restent au niveau compte.

-- Autorise N pages par user (l'app gère la limite par forfait).
drop index if exists public.pages_one_per_user;

-- Projet actif du user.
alter table public.profiles
  add column if not exists active_page_id uuid references public.pages(id) on delete set null;

-- Domaine personnalisé (nullable, unique) + token iCal PAR projet.
alter table public.pages
  add column if not exists custom_domain text unique,
  add column if not exists ical_token uuid not null default gen_random_uuid();

-- ------------------------------------------------------------- voix par projet
-- voice_profiles passe d'une voix par user à une voix par page.
alter table public.voice_profiles
  add column if not exists page_id uuid references public.pages(id) on delete cascade;

update public.voice_profiles v
  set page_id = p.id
  from public.pages p
  where p.user_id = v.user_id and v.page_id is null;

-- Supprime les voix orphelines (user sans page) avant de rendre page_id NOT NULL.
delete from public.voice_profiles where page_id is null;

alter table public.voice_profiles drop constraint if exists voice_profiles_pkey;
alter table public.voice_profiles alter column page_id set not null;
alter table public.voice_profiles add primary key (page_id);
-- La policy RLS "own voice" (auth.uid() = user_id) reste valable : user_id est
-- toujours renseigné à l'insert.

-- -------------------------------------------------------- contenus par projet
alter table public.generations
  add column if not exists page_id uuid references public.pages(id) on delete set null;

update public.generations g
  set page_id = p.id
  from public.pages p
  where p.user_id = g.user_id and g.page_id is null;

create index if not exists generations_page on public.generations (page_id, created_at desc);

-- Résolution host → slug par le middleware : la policy "public page read"
-- (published = true) de 00001 autorise déjà la lecture par custom_domain.
