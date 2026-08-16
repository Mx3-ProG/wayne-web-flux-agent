-- Correctif : public.hit_rate_limit (00046) échouait sur CHAQUE appel avec
-- "column reference \"bucket\" is ambiguous" (42702). Cause : le paramètre
-- plpgsql `bucket` porte le même nom que la colonne `rate_limits.bucket`
-- utilisée dans la clause `on conflict (bucket)` — PL/pgSQL essaie de
-- résoudre l'identifiant à la fois comme variable et comme colonne. Bug
-- resté invisible jusqu'ici : la migration 00046 n'avait jamais été
-- réellement exercée en base avant ce diagnostic (découvert en testant la
-- couche d'intégration, sans rapport avec elle).
--
-- Corrigé en préfixant les paramètres par `p_`, la convention déjà suivie
-- partout ailleurs dans le schéma (set_integration_secret, claim_import_job,
-- etc., cf. 00048/00049) précisément pour éviter ce genre de collision.
-- Même signature de TYPES (text, int, int) : `create or replace` remplace la
-- fonction existante sans avoir besoin de la supprimer.

create or replace function public.hit_rate_limit(
  p_bucket text,
  p_max_hits int,
  p_window_ms int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := now();
  new_reset timestamptz := now() + make_interval(secs => p_window_ms / 1000.0);
  cur_count int;
begin
  insert into public.rate_limits as rl (bucket, count, reset_at)
    values (p_bucket, 1, new_reset)
  on conflict (bucket) do update
    set count = case when rl.reset_at < now_ts then 1 else rl.count + 1 end,
        reset_at = case when rl.reset_at < now_ts then new_reset else rl.reset_at end
  returning rl.count into cur_count;

  return cur_count <= p_max_hits;
end;
$$;

revoke all on function public.hit_rate_limit(text, int, int) from public;
