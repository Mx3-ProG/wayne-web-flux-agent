import "server-only";
import { validAccessToken } from "@/lib/integrations/connectors/google-calendar/token";
import type { ConnectorContext } from "@/lib/integrations/types";

const EVENTS_ENDPOINT = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export type DeltaEvent = {
  id: string;
  status: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

export type DeltaResult = {
  events: DeltaEvent[];
  nextSyncToken: string | null;
  resyncRequired: boolean;
};

// Pull incrémental déclenché par le webhook (qui ne transporte jamais le
// contenu, seulement un ping — cf. webhook.ts). Un syncToken expiré (410)
// impose un resync complet côté Google : on ne maintient pas de miroir
// local complet ici, seulement de la détection de conflit best-effort, donc
// "resync" se contente de repartir d'un syncToken neuf sans tenter de
// rattraper l'historique perdu.
export async function fetchEventDelta(ctx: ConnectorContext, syncToken: string | null): Promise<DeltaResult> {
  const accessToken = await validAccessToken(ctx);
  const events: DeltaEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;

  do {
    const params = new URLSearchParams({ singleEvents: "true", showDeleted: "true" });
    if (syncToken) params.set("syncToken", syncToken);
    else params.set("timeMin", new Date().toISOString());
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${EVENTS_ENDPOINT}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 410) return { events: [], nextSyncToken: null, resyncRequired: true };
    if (!res.ok) throw new Error(`google_delta_failed:${res.status}`);

    const json = await res.json();
    events.push(...(json.items ?? []));
    pageToken = json.nextPageToken;
    if (json.nextSyncToken) nextSyncToken = json.nextSyncToken;
  } while (pageToken);

  return { events, nextSyncToken, resyncRequired: false };
}
