import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIntegrationSecret } from "@/lib/integrations/crypto";
import { fetchEventDelta, type DeltaEvent } from "@/lib/integrations/connectors/google-calendar/delta";
import type { ConnectorContext } from "@/lib/integrations/types";

function noopLogger() {
  return { info() {}, warn() {}, error() {} };
}

async function log(
  admin: ReturnType<typeof createAdminClient>,
  integrationId: string,
  level: "info" | "warn" | "error",
  message: string
) {
  await admin.from("integration_logs").insert({ integration_id: integrationId, level, message: message.slice(0, 2000) });
}

// Compare de façon best-effort la date/heure/prestation d'un événement
// Google au RDV FLUX mappé — pour DÉTECTER un désaccord, jamais pour écrire
// dans `bookings` : automatiser l'écriture depuis une modification externe
// est une décision produit qui reste à prendre (cf. INTEGRATIONS_PLAN.md §
// F.3). En attendant, seul le log de conflit existe.
function describesSameSlot(event: DeltaEvent, booking: { date: string; start_time: string; service_name: string }): boolean {
  const eventStart = event.start?.dateTime ?? event.start?.date ?? "";
  const bookingStart = `${booking.date}T${String(booking.start_time).slice(0, 5)}`;
  return eventStart.slice(0, 16) === bookingStart && event.summary === booking.service_name;
}

// Google Calendar "push notifications" : le corps de la requête est vide,
// tout arrive en headers X-Goog-*. Voir lib/integrations/connectors/
// google-calendar/webhook.ts pour la souscription (watch) et delta.ts pour
// le pull incrémental déclenché ici.
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (provider !== "google_calendar") return new NextResponse(null, { status: 404 });

  const channelId = request.headers.get("x-goog-channel-id");
  const resourceState = request.headers.get("x-goog-resource-state");
  const channelToken = request.headers.get("x-goog-channel-token");
  // Toujours 200 par défaut : Google retente agressivement sur les statuts
  // d'erreur, et on ne veut jamais transformer un canal orphelin/obsolète en
  // boucle de retries.
  if (!channelId) return new NextResponse(null, { status: 200 });

  const admin = createAdminClient();
  const { data: integration } = await admin
    .from("integrations")
    .select("id, page_id, status, metadata")
    .eq("provider", "google_calendar")
    .contains("metadata", { webhook_channel_id: channelId })
    .maybeSingle();

  const metadata = (integration?.metadata ?? {}) as Record<string, string | null>;
  if (!integration || integration.status !== "connected" || metadata.webhook_token !== channelToken) {
    return new NextResponse(null, { status: 200 });
  }

  // Poignée de main initiale à la création du canal : aucun changement à
  // traiter.
  if (resourceState === "sync") return new NextResponse(null, { status: 200 });

  const ctx: ConnectorContext = {
    pageId: integration.page_id,
    integrationId: integration.id,
    getSecret: () => getIntegrationSecret(integration.id),
    logger: noopLogger(),
  };

  try {
    let result = await fetchEventDelta(ctx, metadata.sync_token ?? null);
    if (result.resyncRequired) {
      result = await fetchEventDelta(ctx, null);
    }

    for (const event of result.events) {
      const { data: mapping } = await admin
        .from("external_entity_mappings")
        .select("flux_entity_id")
        .eq("page_id", integration.page_id)
        .eq("provider", "google_calendar")
        .eq("external_entity_type", "appointment")
        .eq("external_id", event.id)
        .maybeSingle();
      if (!mapping) continue; // événement personnel, sans lien avec un RDV FLUX

      const { data: booking } = await admin
        .from("bookings")
        .select("id, status, date, start_time, service_name")
        .eq("id", mapping.flux_entity_id)
        .maybeSingle();
      if (!booking) continue;

      if (event.status === "cancelled" && booking.status === "confirmed") {
        await log(
          admin,
          integration.id,
          "warn",
          `external_cancelled_but_flux_confirmed:booking=${booking.id}:event=${event.id}`
        );
      } else if (event.status !== "cancelled" && !describesSameSlot(event, booking)) {
        await log(admin, integration.id, "info", `external_change_detected:booking=${booking.id}:event=${event.id}`);
      }
    }

    await admin
      .from("integrations")
      .update({
        metadata: { ...metadata, sync_token: result.nextSyncToken ?? metadata.sync_token ?? null },
        last_synced_at: new Date().toISOString(),
        last_sync_status: "ok",
        last_error: null,
      })
      .eq("id", integration.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "webhook_processing_failed";
    console.error("google_calendar webhook processing failed", integration.id, message);
    await log(admin, integration.id, "error", `webhook_failed:${message}`);
    await admin.from("integrations").update({ last_sync_status: "error", last_error: message.slice(0, 500) }).eq("id", integration.id);
  }

  return new NextResponse(null, { status: 200 });
}
