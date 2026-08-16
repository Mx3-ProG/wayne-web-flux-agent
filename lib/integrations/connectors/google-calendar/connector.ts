import "server-only";
import type {
  CanonicalAppointment,
  CanonicalEntity,
  Connector,
  ConnectorAuthResult,
  ExternalEntityType,
  OAuthCallbackInput,
  RawRecord,
} from "@/lib/integrations/types";
import { buildAuthUrl, exchangeCode, refreshAccessToken, revokeToken, type GoogleTokenPayload } from "@/lib/integrations/connectors/google-calendar/oauth";
import { validAccessToken } from "@/lib/integrations/connectors/google-calendar/token";
import { stopChannel } from "@/lib/integrations/connectors/google-calendar/webhook";
import { addMinutes } from "@/lib/integrations/naive-time";

const EVENTS_ENDPOINT = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

// appt.startAt est un horaire "naïf" (YYYY-MM-DDTHH:MM:SS, sans offset) dans
// le fuseau de la boutique — jamais converti via `new Date().toISOString()`,
// qui basculerait silencieusement sur le fuseau du runtime (UTC sur
// Vercel). Google Calendar accepte cette forme tant que `timeZone`
// accompagne `dateTime` (cf. lib/integrations/naive-time.ts).
function toGoogleEvent(appt: CanonicalAppointment) {
  return {
    summary: appt.serviceName,
    start: { dateTime: appt.startAt, timeZone: "Europe/Paris" },
    end: { dateTime: addMinutes(appt.startAt, appt.durationMin), timeZone: "Europe/Paris" },
    status: appt.status === "cancelled" ? "cancelled" : "confirmed",
  };
}

export const googleCalendarConnector: Connector = {
  provider: "google_calendar",
  capabilities: ["READ_APPOINTMENTS", "WRITE_APPOINTMENTS"],

  buildAuthorizationUrl(state: string): string {
    return buildAuthUrl(state);
  },

  async authenticate(_ctx, input): Promise<ConnectorAuthResult> {
    if (input.kind !== "oauth2") throw new Error("unsupported_auth_kind");
    const oauthInput = input as OAuthCallbackInput;
    const token = await exchangeCode(oauthInput.code);
    return {
      authType: "oauth2",
      secretPayload: token,
      expiresAt: token.expiry,
    };
  },

  async refreshAuthentication(ctx): Promise<ConnectorAuthResult> {
    const secret = (await ctx.getSecret()) as GoogleTokenPayload | null;
    if (!secret?.refresh_token) throw new Error("missing_refresh_token");
    const refreshed = await refreshAccessToken(secret.refresh_token);
    return { authType: "oauth2", secretPayload: refreshed, expiresAt: refreshed.expiry };
  },

  async disconnect(ctx): Promise<void> {
    // Best-effort : le canal webhook expirera de toute façon (renouvellement
    // non reconduit, cf. app/api/cron/renew-webhooks), mais l'arrêter tout
    // de suite évite des notifications inutiles vers un token révoqué.
    await stopChannel(ctx.integrationId).catch(() => {});
    const secret = (await ctx.getSecret()) as GoogleTokenPayload | null;
    if (secret?.access_token) await revokeToken(secret.access_token);
  },

  async pushAppointment(ctx, appt): Promise<{ externalId: string }> {
    const accessToken = await validAccessToken(ctx);
    const res = await fetch(EVENTS_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(toGoogleEvent(appt)),
    });
    if (!res.ok) throw new Error(`google_event_create_failed:${res.status}`);
    const json = await res.json();
    return { externalId: json.id as string };
  },

  async updateAppointment(ctx, externalId, patch): Promise<void> {
    const accessToken = await validAccessToken(ctx);
    const body: Record<string, unknown> = {};
    if (patch.status) body.status = patch.status === "cancelled" ? "cancelled" : "confirmed";
    if (patch.serviceName) body.summary = patch.serviceName;
    if (patch.startAt && patch.durationMin) {
      body.start = { dateTime: patch.startAt, timeZone: "Europe/Paris" };
      body.end = { dateTime: addMinutes(patch.startAt, patch.durationMin), timeZone: "Europe/Paris" };
    }
    const res = await fetch(`${EVENTS_ENDPOINT}/${encodeURIComponent(externalId)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok && res.status !== 404) throw new Error(`google_event_update_failed:${res.status}`);
  },

  async *fetchAppointments(ctx, since): AsyncGenerator<RawRecord> {
    const accessToken = await validAccessToken(ctx);
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      timeMin: since ?? new Date().toISOString(),
      maxResults: "250",
    });
    const res = await fetch(`${EVENTS_ENDPOINT}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`google_events_list_failed:${res.status}`);
    const json = await res.json();
    for (const item of json.items ?? []) {
      yield {
        externalId: item.id,
        updatedAt: item.updated,
        data: item,
      };
    }
  },

  mapToCanonical(entityType: ExternalEntityType, raw: RawRecord): CanonicalEntity {
    if (entityType !== "appointment") throw new Error("unsupported_entity_type");
    const data = raw.data as {
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      status?: string;
    };
    const startAt = data.start?.dateTime ?? data.start?.date ?? new Date().toISOString();
    const endAt = data.end?.dateTime ?? data.end?.date ?? startAt;
    const durationMin = Math.max(5, Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000));
    return {
      type: "appointment",
      entity: {
        pageId: "",
        serviceName: data.summary ?? "Événement",
        startAt,
        durationMin,
        priceCents: 0,
        status: data.status === "cancelled" ? "cancelled" : "confirmed",
        source: "google_calendar",
      },
    };
  },
};
