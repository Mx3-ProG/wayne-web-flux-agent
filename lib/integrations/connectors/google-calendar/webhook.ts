import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIntegrationSecret } from "@/lib/integrations/crypto";
import { validAccessToken } from "@/lib/integrations/connectors/google-calendar/token";
import type { ConnectorContext } from "@/lib/integrations/types";

// Souscription "push notifications" de l'API Google Calendar : Google
// n'envoie JAMAIS le contenu de l'événement modifié, seulement un ping
// (canal + état de la ressource) qui déclenche un pull incrémental côté
// FLUX (syncToken, cf. app/api/integrations/[provider]/webhook). C'est du
// plomberie propre à Google — volontairement gardée hors de l'interface
// Connector générique (un seul connecteur webhook aujourd'hui, cf.
// INTEGRATIONS_PLAN.md § I : ne pas sur-engineer une abstraction qu'un seul
// cas d'usage réel occupe).

const WATCH_ENDPOINT = "https://www.googleapis.com/calendar/v3/calendars/primary/events/watch";
const STOP_ENDPOINT = "https://www.googleapis.com/calendar/v3/channels/stop";

function noopLogger() {
  return { info() {}, warn() {}, error() {} };
}

function contextFor(pageId: string, integrationId: string): ConnectorContext {
  return {
    pageId,
    integrationId,
    getSecret: () => getIntegrationSecret(integrationId),
    logger: noopLogger(),
  };
}

export async function subscribeWebhook(pageId: string, integrationId: string): Promise<void> {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) throw new Error("missing_site_url");

  const accessToken = await validAccessToken(contextFor(pageId, integrationId));
  const channelId = randomUUID();
  const channelToken = randomUUID();

  const res = await fetch(WATCH_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      id: channelId,
      type: "web_hook",
      address: `${site}/api/integrations/google_calendar/webhook`,
      token: channelToken,
    }),
  });
  if (!res.ok) throw new Error(`google_watch_failed:${res.status}`);
  const json = (await res.json()) as { resourceId: string; expiration?: string };

  const admin = createAdminClient();
  await admin
    .from("integrations")
    .update({
      metadata: {
        webhook_channel_id: channelId,
        webhook_resource_id: json.resourceId,
        webhook_token: channelToken,
        webhook_expiration: json.expiration ? new Date(Number(json.expiration)).toISOString() : null,
      },
    })
    .eq("id", integrationId);
}

// Best-effort : appelée avant la révocation du token (disconnect) et par le
// cron de renouvellement avant de recréer un canal. Ne lève jamais — un
// canal orphelin expire de toute façon côté Google.
export async function stopChannel(integrationId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: integration } = await admin
    .from("integrations")
    .select("page_id, metadata")
    .eq("id", integrationId)
    .maybeSingle();

  const metadata = (integration?.metadata ?? {}) as Record<string, string | null>;
  const channelId = metadata.webhook_channel_id;
  const resourceId = metadata.webhook_resource_id;
  if (!integration || !channelId || !resourceId) return;

  try {
    const accessToken = await validAccessToken(contextFor(integration.page_id, integrationId));
    await fetch(STOP_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id: channelId, resourceId }),
    });
  } catch {
    // Le token peut déjà être invalide (reprise après échec) : sans
    // conséquence, le canal expirera naturellement.
  }
}

// Renouvelle un canal proche de l'expiration en en recréant un nouveau (il
// n'existe pas d'endpoint Google pour "prolonger" un canal existant).
export async function renewWebhookIfNeeded(
  pageId: string,
  integrationId: string,
  expiration: string | null
): Promise<"renewed" | "skipped"> {
  const expiresInMs = expiration ? new Date(expiration).getTime() - Date.now() : 0;
  if (expiresInMs > 48 * 3600 * 1000) return "skipped";
  await stopChannel(integrationId);
  await subscribeWebhook(pageId, integrationId);
  return "renewed";
}
