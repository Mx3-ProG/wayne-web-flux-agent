-- Wayne Web Flux — import CSV universel (Phase 1 de la couche d'intégration).
-- Voir INTEGRATIONS_PLAN.md section E. Réutilise le pattern déjà en place
-- pour les jobs asynchrones (translation_jobs, 00038) : claim/complete/fail
-- via `for update skip locked`, worker cron avec Bearer CRON_SECRET.
--
-- Une ligne de import_rows par ligne du CSV : permet une reprise fine
-- (batch par batch, plusieurs invocations cron) et un rapport précis, sans
-- dupliquer une table d'erreurs séparée (le statut + error_reason de chaque
-- ligne suffit — cf. plan, section J, principe YAGNI).

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  entity_type text not null check (entity_type in
    ('customers', 'appointments', 'products', 'services')),
  status text not null default 'uploaded' check (status in
    ('uploaded', 'mapping', 'ready', 'processing', 'completed', 'failed', 'cancelled')),
  file_name text not null,
  file_path text not null,
  detected_delimiter text,
  detected_encoding text,
  headers text[] not null default '{}',
  column_mapping jsonb not null default '{}'::jsonb,
  total_rows int,
  imported_rows int not null default 0,
  merged_rows int not null default 0,
  skipped_rows int not null default 0,
  error_rows int not null default 0,
  attempts int not null default 0,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index import_jobs_page on public.import_jobs (page_id, created_at desc);
create index import_jobs_status on public.import_jobs (status) where status in ('ready', 'processing');

create table public.import_rows (
  id bigint generated always as identity primary key,
  import_job_id uuid not null references public.import_jobs on delete cascade,
  row_number int not null,
  raw_row jsonb not null,
  status text not null default 'pending' check (status in
    ('pending', 'processing', 'imported', 'merged', 'skipped', 'error')),
  error_reason text,
  claimed_at timestamptz,
  processed_at timestamptz,
  unique (import_job_id, row_number)
);

create index import_rows_pending on public.import_rows (import_job_id) where status = 'pending';
create index import_rows_processing on public.import_rows (import_job_id) where status = 'processing';

-- ------------------------------------------------------------------ storage
-- Même politique que 'page-photos' (00001) : écriture/lecture scopées au
-- dossier `${user_id}/...`, mais bucket PRIVÉ (contient potentiellement des
-- données personnelles de clients, contrairement aux photos de vitrine).
insert into storage.buckets (id, name, public)
values ('imports', 'imports', false)
on conflict (id) do nothing;

create policy "imports owner write" on storage.objects
  for insert with check (bucket_id = 'imports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "imports owner read" on storage.objects
  for select using (bucket_id = 'imports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "imports owner delete" on storage.objects
  for delete using (bucket_id = 'imports' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================== fonctions

-- Un seul job actif à la fois par run de worker (MAX_JOBS_PER_RUN côté
-- app) : priorité aux jobs prêts non démarrés, puis reprise des jobs déjà en
-- cours qui ont encore des lignes en attente.
create or replace function public.claim_import_job()
returns public.import_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  job public.import_jobs;
begin
  select * into job
  from public.import_jobs
  where status = 'ready'
  order by created_at
  limit 1
  for update skip locked;

  if job.id is not null then
    update public.import_jobs
    set status = 'processing', started_at = now(), locked_at = now(), attempts = attempts + 1
    where id = job.id
    returning * into job;
    return job;
  end if;

  select * into job
  from public.import_jobs
  where status = 'processing'
    and exists (
      select 1 from public.import_rows
      where import_job_id = import_jobs.id and status in ('pending', 'processing')
    )
  order by started_at
  limit 1
  for update skip locked;

  if job.id is null then
    return null;
  end if;

  update public.import_jobs set locked_at = now() where id = job.id returning * into job;
  return job;
end;
$$;

create or replace function public.claim_import_rows(p_job_id uuid, p_batch_size int)
returns setof public.import_rows
language sql
security definer
set search_path = public
as $$
  update public.import_rows
  set status = 'processing', claimed_at = now()
  where id in (
    select id from public.import_rows
    where import_job_id = p_job_id and status = 'pending'
    order by row_number
    limit greatest(1, least(p_batch_size, 500))
    for update skip locked
  )
  returning *;
$$;

create or replace function public.complete_import_row(
  p_row_id bigint,
  p_status text,
  p_error_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
begin
  if p_status not in ('imported', 'merged', 'skipped', 'error') then
    raise exception 'invalid_row_status';
  end if;

  update public.import_rows
  set status = p_status,
      error_reason = left(coalesce(p_error_reason, ''), 500),
      processed_at = now()
  where id = p_row_id and status = 'processing'
  returning import_job_id into v_job_id;

  if v_job_id is null then
    return; -- déjà traitée (reprise après reap) : idempotent, pas d'erreur
  end if;

  update public.import_jobs set
    imported_rows = imported_rows + case when p_status = 'imported' then 1 else 0 end,
    merged_rows = merged_rows + case when p_status = 'merged' then 1 else 0 end,
    skipped_rows = skipped_rows + case when p_status = 'skipped' then 1 else 0 end,
    error_rows = error_rows + case when p_status = 'error' then 1 else 0 end
  where id = v_job_id;
end;
$$;

-- Clôture le job une fois qu'il ne reste plus aucune ligne pending/processing.
-- No-op si des lignes restent : le worker rappellera ce job au prochain tick.
create or replace function public.finalize_import_job(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining int;
begin
  select count(*) into v_remaining
  from public.import_rows
  where import_job_id = p_job_id and status in ('pending', 'processing');

  if v_remaining > 0 then
    return false;
  end if;

  update public.import_jobs
  set status = 'completed', completed_at = now()
  where id = p_job_id and status = 'processing';

  return true;
end;
$$;

-- Reprise après timeout : une ligne restée 'processing' trop longtemps
-- (worker mort en plein batch) redevient 'pending'.
create or replace function public.reap_stalled_import_rows()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  reset_count int;
begin
  update public.import_rows
  set status = 'pending', claimed_at = null
  where status = 'processing' and claimed_at < now() - interval '10 minutes';
  get diagnostics reset_count = row_count;
  return reset_count;
end;
$$;

revoke all on function public.claim_import_job() from public, anon, authenticated;
revoke all on function public.claim_import_rows(uuid, int) from public, anon, authenticated;
revoke all on function public.complete_import_row(bigint, text, text) from public, anon, authenticated;
revoke all on function public.finalize_import_job(uuid) from public, anon, authenticated;
revoke all on function public.reap_stalled_import_rows() from public, anon, authenticated;

-- ==================================================================== RLS
alter table public.import_jobs enable row level security;
alter table public.import_rows enable row level security;

create policy "own import jobs" on public.import_jobs
  for all using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

create policy "own import rows read" on public.import_rows
  for select using (exists (
    select 1 from public.import_jobs j
    join public.pages p on p.id = j.page_id
    where j.id = import_job_id and p.user_id = auth.uid()
  ));
-- Écriture des import_rows réservée au rôle service (route de confirmation +
-- worker) : pas de policy insert/update/delete pour authenticated.
