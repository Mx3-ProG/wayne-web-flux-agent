-- Le webhook d'appel entrant reçoit le numéro composé (`To`, E.164) et pas
-- l'identifiant interne du provider (`telephony_number_id`, utile seulement
-- pour la configuration côté API du provider). La résolution runtime du
-- tenant doit donc se faire sur `phone_number`, pas sur `telephony_number_id`
-- comme prévu par erreur dans l'index unique de 00050 — additif, on ne
-- retouche pas 00050 déjà appliquée.

create unique index voice_agent_config_phone_number
  on public.voice_agent_config (phone_number)
  where phone_number is not null;
