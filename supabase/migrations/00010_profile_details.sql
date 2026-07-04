-- Informations personnelles et professionnelles du profil FLUX.
alter table public.profiles
  add column if not exists phone text,
  add column if not exists company_name text,
  add column if not exists job_title text,
  add column if not exists business_email text,
  add column if not exists siret text,
  add column if not exists address text;
