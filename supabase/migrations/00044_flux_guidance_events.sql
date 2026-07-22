-- Mesure des prises de parole éditoriales de FLUX. Aucun texte saisi par
-- l'utilisateur n'est stocké : intent_id contient uniquement un identifiant
-- de message contrôlé par lib/assistant/guidance.ts.

alter table public.assistant_events
  drop constraint if exists assistant_events_event_type_check;

alter table public.assistant_events
  add constraint assistant_events_event_type_check check (event_type in (
    'opened', 'suggestion_shown', 'suggestion_dismissed', 'result_selected',
    'no_result', 'paused', 'disabled', 'message_seen', 'message_dismissed',
    'action_clicked', 'step_completed'
  ));

create index if not exists assistant_events_intent_created
  on public.assistant_events (intent_id, event_type, created_at desc)
  where intent_id is not null;
