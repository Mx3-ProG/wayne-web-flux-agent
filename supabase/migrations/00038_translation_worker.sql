-- Lot 6 : branche réellement localized_content / translation_jobs (posées par
-- 00034) à la publication, et rend la publication d'une traduction atomique.
--
-- Choix délibéré : ne PAS toucher à publish_page/publish_page_unchecked (la
-- fonction a été redéfinie par plusieurs migrations successives et reste la
-- plus sensible du schéma — facturation, versions, contenu live). On
-- accroche l'enqueue à un trigger AFTER INSERT sur page_versions, la table
-- dans laquelle CHAQUE chemin de publish_page écrit en dernière étape, juste
-- avant de retourner le nouveau solde. Zéro modification d'une fonction
-- existante, zéro risque de régression sur la publication elle-même.

-- 1. Distinguer contenu publié (visible publiquement) de contenu en
--    préparation (traduction en cours). Le schéma actuel n'a qu'une seule
--    colonne `fields` par ligne : une traduction "stale → queued →
--    translating" y écrirait par-dessus le contenu encore public, créant une
--    fenêtre où la vitrine perdrait sa traduction en cours de régénération.
--    `published_fields` reste intact tant que la nouvelle traduction n'est
--    pas entièrement validée.
alter table public.localized_content
  add column if not exists published_fields jsonb,
  add column if not exists published_source_hash text,
  add column if not exists published_at timestamptz;

-- Le rendu public doit lire published_fields, jamais fields (qui peut être
-- une traduction à moitié écrite ou en échec). On resserre la policy
-- existante en conséquence.
drop policy if exists "public reads ready localized content" on public.localized_content;
create policy "public reads published localized content" on public.localized_content for select
  using (published_fields is not null and exists (
    select 1 from public.pages p
    where p.id = page_id and p.published and locale = any(p.enabled_locales)
  ));

-- 2. Enqueue idempotent à chaque publication réussie.
create or replace function public.enqueue_translations_after_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enqueue_page_translations(new.page_id);
  return new;
end;
$$;

drop trigger if exists enqueue_translations_after_publish on public.page_versions;
create trigger enqueue_translations_after_publish
after insert on public.page_versions
for each row execute function public.enqueue_translations_after_publish();

-- Idem à l'activation d'une nouvelle langue (set_page_locales) : le
-- commerçant vient de payer 25 crédits pour cette langue, elle doit se
-- remplir tout de suite plutôt qu'attendre la prochaine publication. On
-- s'accroche à la même table que le trigger de garde déjà en place
-- (guard_page_locale_change, migration 00036) plutôt que de toucher
-- set_page_locales elle-même.
create or replace function public.enqueue_translations_after_locale_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.enabled_locales is distinct from new.enabled_locales then
    perform public.enqueue_page_translations(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists enqueue_translations_after_locale_change on public.pages;
create trigger enqueue_translations_after_locale_change
after update of enabled_locales on public.pages
for each row execute function public.enqueue_translations_after_locale_change();

-- 3. Verrouillage d'un job par le worker. `for update skip locked` : deux
--    workers concurrents ne peuvent jamais saisir le même job. Réservé au
--    rôle service (le worker tourne avec la clé service, pas une session
--    utilisateur) — pas de grant à `authenticated`.
create or replace function public.claim_translation_job()
returns public.translation_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  job public.translation_jobs;
begin
  select * into job
  from public.translation_jobs
  where status = 'queued' and available_at <= now()
  order by available_at
  limit 1
  for update skip locked;

  if job.id is null then
    return null;
  end if;

  update public.translation_jobs
  set status = 'processing', locked_at = now(), attempts = attempts + 1
  where id = job.id
  returning * into job;

  return job;
end;
$$;

-- 4. Complétion atomique : les traductions de TOUTES les entités du job et le
--    passage du job à `completed` se font dans la même transaction. Si
--    n'importe quelle étape échoue, Postgres annule tout — aucune entité
--    traduite à moitié ne peut devenir publique, et le job reste `processing`
--    jusqu'au prochain nettoyage (voir reap_stalled_translation_jobs) plutôt
--    que d'être marqué à tort comme terminé.
--
--    entities : jsonb array de {entity_type, entity_id, fields, source_hash}.
create or replace function public.complete_translation_job(
  job_id uuid,
  entities jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  job public.translation_jobs;
  item jsonb;
begin
  select * into job from public.translation_jobs where id = job_id and status = 'processing' for update;
  if job.id is null then
    raise exception 'job_not_found_or_not_processing' using errcode = 'P0001';
  end if;
  if entities is null or jsonb_typeof(entities) <> 'array' then
    raise exception 'invalid_entities_payload' using errcode = 'P0001';
  end if;

  for item in select * from jsonb_array_elements(entities) loop
    if not (item ? 'entity_type' and item ? 'entity_id' and item ? 'fields' and item ? 'source_hash') then
      raise exception 'invalid_entity_payload' using errcode = 'P0001';
    end if;
    insert into public.localized_content (
      page_id, entity_type, entity_id, locale, fields, source_hash, status,
      published_fields, published_source_hash, published_at, translated_at
    )
    values (
      job.page_id,
      item->>'entity_type',
      (item->>'entity_id')::uuid,
      job.locale,
      item->'fields',
      item->>'source_hash',
      'ready',
      item->'fields',
      item->>'source_hash',
      now(),
      now()
    )
    on conflict (entity_type, entity_id, locale) do update
      set fields = excluded.fields,
          source_hash = excluded.source_hash,
          status = 'ready',
          published_fields = excluded.published_fields,
          published_source_hash = excluded.published_source_hash,
          published_at = excluded.published_at,
          translated_at = excluded.translated_at,
          last_error = null,
          updated_at = now();
  end loop;

  update public.translation_jobs
  set status = 'completed', completed_at = now(), last_error = null
  where id = job_id;
end;
$$;

-- 5. Échec : le contenu déjà publié n'est jamais touché (aucune écriture sur
--    published_fields ici), seul le job et la ligne `fields`/`status` de
--    travail changent.
create or replace function public.fail_translation_job(job_id uuid, error_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.translation_jobs
  set status = 'error', last_error = left(coalesce(error_message, 'unknown_error'), 2000)
  where id = job_id and status = 'processing';

  update public.localized_content
  set status = 'error', last_error = left(coalesce(error_message, 'unknown_error'), 2000), updated_at = now()
  where page_id = (select page_id from public.translation_jobs where id = job_id)
    and locale = (select locale from public.translation_jobs where id = job_id)
    and status = 'translating';
end;
$$;

-- 6. Reprise après timeout : un job resté `processing` trop longtemps (worker
--    mort en plein traitement) redevient `queued` pour être repris — sans
--    jamais dépasser un nombre d'essais raisonnable, au-delà duquel on
--    l'abandonne en erreur plutôt que de boucler indéfiniment.
create or replace function public.reap_stalled_translation_jobs()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  reset_count int;
begin
  update public.translation_jobs
  set status = 'queued', available_at = now(), locked_at = null
  where status = 'processing'
    and locked_at < now() - interval '10 minutes'
    and attempts < 5;
  get diagnostics reset_count = row_count;

  update public.translation_jobs
  set status = 'error', last_error = 'stalled_too_many_attempts'
  where status = 'processing'
    and locked_at < now() - interval '10 minutes'
    and attempts >= 5;

  return reset_count;
end;
$$;

-- Uniquement pour le rôle service (worker) : ni authenticated, ni anon.
revoke all on function public.claim_translation_job() from public, anon, authenticated;
revoke all on function public.complete_translation_job(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.fail_translation_job(uuid, text) from public, anon, authenticated;
revoke all on function public.reap_stalled_translation_jobs() from public, anon, authenticated;
