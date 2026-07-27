-- Wayne Web Flux — rate-limiting persistant, partagé entre toutes les instances
-- serverless (le Map en mémoire par lambda ne freinait rien sur Vercel).
-- Écrit uniquement via le client service-role depuis les routes API.

create table if not exists public.rate_limits (
  bucket text primary key,
  count int not null default 0,
  reset_at timestamptz not null default now()
);

-- RLS sans policy : accessible uniquement au service-role (routes API).
alter table public.rate_limits enable row level security;

-- Incrément atomique sous verrou de ligne (ON CONFLICT). Renvoie true tant que
-- le quota n'est pas dépassé sur la fenêtre courante.
create or replace function public.hit_rate_limit(
  bucket text,
  max_hits int,
  window_ms int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := now();
  new_reset timestamptz := now() + make_interval(secs => window_ms / 1000.0);
  cur_count int;
begin
  insert into public.rate_limits as rl (bucket, count, reset_at)
    values (hit_rate_limit.bucket, 1, new_reset)
  on conflict (bucket) do update
    set count = case when rl.reset_at < now_ts then 1 else rl.count + 1 end,
        reset_at = case when rl.reset_at < now_ts then new_reset else rl.reset_at end
  returning rl.count into cur_count;

  return cur_count <= max_hits;
end;
$$;

revoke all on function public.hit_rate_limit(text, int, int) from public;
