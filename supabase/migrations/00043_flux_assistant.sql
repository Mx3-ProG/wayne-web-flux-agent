-- Assistant FLUX déterministe : préférences, progression et métriques sans
-- conservation des recherches saisies. L'aide publique est opt-in par vitrine.

alter table public.pages
  add column if not exists assistant_enabled boolean not null default false;

create table if not exists public.assistant_preferences (
  user_id uuid primary key references auth.users on delete cascade,
  enabled boolean not null default true,
  paused_until timestamptz,
  current_goal_id text check (current_goal_id is null or length(current_goal_id) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_topic_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  scope_key text not null default 'global' check (length(scope_key) between 1 and 100),
  topic_id text not null check (length(topic_id) between 1 and 100),
  status text not null default 'active' check (status in ('active', 'completed', 'dismissed')),
  reminder_count int not null default 0 check (reminder_count between 0 and 1000),
  last_prompted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, scope_key, topic_id)
);

create table if not exists public.assistant_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  page_id uuid references public.pages on delete cascade,
  surface text not null check (surface in ('marketing', 'onboarding', 'app', 'storefront')),
  event_type text not null check (event_type in (
    'opened', 'suggestion_shown', 'suggestion_dismissed', 'result_selected',
    'no_result', 'paused', 'disabled'
  )),
  intent_id text check (intent_id is null or length(intent_id) <= 100),
  route_key text check (route_key is null or length(route_key) <= 160),
  confidence_bucket text check (confidence_bucket is null or confidence_bucket in ('high', 'medium', 'low')),
  created_at timestamptz not null default now()
);

create index if not exists assistant_events_created on public.assistant_events (created_at desc);
create index if not exists assistant_events_user on public.assistant_events (user_id, created_at desc);

alter table public.assistant_preferences enable row level security;
alter table public.assistant_topic_progress enable row level security;
alter table public.assistant_events enable row level security;

-- Centralise la mise à jour afin que le compteur de relances soit atomique,
-- même si deux signaux arrivent presque au même moment.
create or replace function public.record_assistant_topic(
  p_scope_key text,
  p_topic_id text,
  p_status text,
  p_prompted boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;
  if length(p_scope_key) not between 1 and 100
    or length(p_topic_id) not between 1 and 100
    or p_status not in ('active', 'completed', 'dismissed') then
    raise exception 'invalid assistant topic';
  end if;

  insert into public.assistant_topic_progress (
    user_id, scope_key, topic_id, status, reminder_count, last_prompted_at
  ) values (
    current_user_id,
    p_scope_key,
    p_topic_id,
    p_status,
    case when p_prompted then 1 else 0 end,
    case when p_prompted then now() else null end
  )
  on conflict (user_id, scope_key, topic_id) do update set
    status = excluded.status,
    reminder_count = assistant_topic_progress.reminder_count
      + case when p_prompted then 1 else 0 end,
    last_prompted_at = case
      when p_prompted then now()
      else assistant_topic_progress.last_prompted_at
    end;
end;
$$;

revoke all on function public.record_assistant_topic(text, text, text, boolean) from public;
grant execute on function public.record_assistant_topic(text, text, text, boolean) to authenticated;

create policy "own assistant preferences" on public.assistant_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own assistant progress" on public.assistant_topic_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own assistant events read" on public.assistant_events
  for select using (auth.uid() = user_id);
create policy "own assistant events insert" on public.assistant_events
  for insert with check (auth.uid() = user_id);
create policy "anonymous assistant events insert" on public.assistant_events
  for insert with check (auth.uid() is null and user_id is null);

create trigger assistant_preferences_touch before update on public.assistant_preferences
  for each row execute function public.touch_updated_at();
create trigger assistant_topic_progress_touch before update on public.assistant_topic_progress
  for each row execute function public.touch_updated_at();
