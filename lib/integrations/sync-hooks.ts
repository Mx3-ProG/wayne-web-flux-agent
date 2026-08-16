import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConnector } from "@/lib/integrations/registry";
import { getIntegrationSecret } from "@/lib/integrations/crypto";
import { toNaiveIso } from "@/lib/integrations/naive-time";
import type { CanonicalAppointment, ConnectorContext } from "@/lib/integrations/types";

type Admin = ReturnType<typeof createAdminClient>;

async function log(
  admin: Admin,
  integrationId: string,
  level: "info" | "warn" | "error",
  message: string
) {
  await admin.from("integration_logs").insert({ integration_id: integrationId, level, message: message.slice(0, 2000) });
}

function contextFor(admin: Admin, pageId: string, integrationId: string): ConnectorContext {
  return {
    pageId,
    integrationId,
    getSecret: () => getIntegrationSecret(integrationId),
    logger: {
      info: (m) => void log(admin, integrationId, "info", m),
      warn: (m) => void log(admin, integrationId, "warn", m),
      error: (m) => void log(admin, integrationId, "error", m),
    },
  };
}

// Répercute une décision prise dans l'agenda FLUX (RDV confirmé/annulé) vers
// les connecteurs WRITE_APPOINTMENTS connectés pour la page. Best-effort et
// non bloquant à dessein : un fournisseur externe en échec ne doit jamais
// empêcher le professionnel d'accepter ou d'annuler un rendez-vous dans
// FLUX (cf. INTEGRATIONS_PLAN.md § F.4). Toute erreur est journalisée
// (integration_logs) plutôt que remontée à l'appelant.
export async function syncBookingToConnectors(
  bookingId: string,
  action: "confirmed" | "cancelled"
): Promise<void> {
  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("id, page_id, service_name, date, start_time, duration_min, price_cents")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return;

  const { data: integrations } = await admin
    .from("integrations")
    .select("id, provider, capabilities")
    .eq("page_id", booking.page_id)
    .eq("status", "connected");
  if (!integrations?.length) return;

  const appointment: CanonicalAppointment = {
    pageId: booking.page_id,
    serviceName: booking.service_name,
    startAt: toNaiveIso(booking.date, String(booking.start_time)),
    durationMin: booking.duration_min,
    priceCents: booking.price_cents,
    status: action,
    source: "flux",
  };

  for (const integration of integrations) {
    const capabilities = (integration.capabilities ?? []) as string[];
    if (!capabilities.includes("WRITE_APPOINTMENTS")) continue;
    const connector = getConnector(integration.provider);
    if (!connector?.pushAppointment || !connector.updateAppointment) continue;

    const ctx = contextFor(admin, booking.page_id, integration.id);

    try {
      const { data: mapping } = await admin
        .from("external_entity_mappings")
        .select("external_id")
        .eq("page_id", booking.page_id)
        .eq("provider", integration.provider)
        .eq("flux_entity_type", "booking")
        .eq("flux_entity_id", booking.id)
        .maybeSingle();

      if (mapping) {
        await connector.updateAppointment(ctx, mapping.external_id, appointment);
      } else if (action === "confirmed") {
        const { externalId } = await connector.pushAppointment(ctx, appointment);
        await admin.from("external_entity_mappings").insert({
          page_id: booking.page_id,
          integration_id: integration.id,
          provider: integration.provider,
          external_entity_type: "appointment",
          external_id: externalId,
          flux_entity_type: "booking",
          flux_entity_id: booking.id,
        });
      }
      // Rien à faire pour une annulation sans mapping existant : le RDV
      // n'avait jamais été poussé côté fournisseur (refusé avant acceptation).

      await admin
        .from("integrations")
        .update({ last_synced_at: new Date().toISOString(), last_sync_status: "ok", last_error: null })
        .eq("id", integration.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "sync_failed";
      await log(admin, integration.id, "error", `booking_sync_failed:${bookingId}:${message}`);
      await admin
        .from("integrations")
        .update({ last_sync_status: "error", last_error: message.slice(0, 500) })
        .eq("id", integration.id);
    }
  }
}
