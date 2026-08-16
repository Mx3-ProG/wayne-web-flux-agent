import "server-only";

// Logs structurés, corrélés par call_id/page_id — jamais de contenu de
// conversation ni de secret. Pas de nouvelle brique d'observabilité : ce sont
// des console.log/error structurés, comme le reste du repo (aucun APM en place).
export function logVoiceEvent(event: {
  callId?: string;
  pageId?: string;
  tool?: string;
  durationMs?: number;
  outcome?: string;
  error?: string;
}): void {
  const line = { at: new Date().toISOString(), scope: "voice", ...event };
  if (event.error) console.error(JSON.stringify(line));
  else console.log(JSON.stringify(line));
}
