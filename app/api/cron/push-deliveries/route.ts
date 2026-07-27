import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { webpush, pushConfigured } from "@/lib/push";

export const maxDuration = 60;

// Worker d'envoi Web Push. Même convention que les autres crons (Bearer
// CRON_SECRET + service role). Réclame les livraisons dues via
// claim_notification_deliveries() (migration 00032), envoie chaque notification,
// puis marque la livraison sent / retrying / failed. Un endpoint mort
// (404/410) désactive l'appareil.
//
// Déclenchement : cron Vercel (vercel.json) ou cron externe, ~chaque minute.

const MAX_ATTEMPTS = 5;

// Backoff exponentiel borné : 30s, 60s, 120s… plafonné à 1h.
function backoffSeconds(attempts: number): number {
  return Math.min(3600, 30 * 2 ** Math.max(0, attempts - 1));
}

type DeliveryRow = {
  delivery_id: string;
  notification_id: string;
  subscription_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  title: string;
  body: string;
  action_url: string;
  notification_type: string;
  badge_count: number;
};

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!pushConfigured) {
    return NextResponse.json({ error: "vapid_not_configured" }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_notification_deliveries", {
    batch_size: 100,
  });
  if (error) {
    return NextResponse.json({ error: "claim_failed", message: error.message }, { status: 500 });
  }
  const rows = (data ?? []) as DeliveryRow[];

  let sent = 0,
    retried = 0,
    failed = 0,
    disabled = 0;

  for (const row of rows) {
    const payload = JSON.stringify({
      title: row.title,
      body: row.body,
      url: row.action_url,
      type: row.notification_type,
      badge: Number(row.badge_count) || 0,
    });
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        payload
      );
      await admin
        .from("notification_deliveries")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.delivery_id);
      sent++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      const message = err instanceof Error ? err.message : String(err);

      if (statusCode === 404 || statusCode === 410) {
        // Abonnement expiré/révoqué : on désactive l'appareil, plus de retry.
        await admin
          .from("push_subscriptions")
          .update({ disabled_at: new Date().toISOString() })
          .eq("id", row.subscription_id);
        await admin
          .from("notification_deliveries")
          .update({
            status: "failed",
            last_error: `gone_${statusCode}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.delivery_id);
        disabled++;
        failed++;
        continue;
      }

      // claim a déjà incrémenté attempts : on relit pour décider retry vs abandon.
      const { data: current } = await admin
        .from("notification_deliveries")
        .select("attempts")
        .eq("id", row.delivery_id)
        .single();
      const attempts = current?.attempts ?? 1;
      if (attempts >= MAX_ATTEMPTS) {
        await admin
          .from("notification_deliveries")
          .update({
            status: "failed",
            last_error: message.slice(0, 300),
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.delivery_id);
        failed++;
      } else {
        await admin
          .from("notification_deliveries")
          .update({
            status: "retrying",
            next_attempt_at: new Date(Date.now() + backoffSeconds(attempts) * 1000).toISOString(),
            last_error: message.slice(0, 300),
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.delivery_id);
        retried++;
      }
    }
  }

  return NextResponse.json({ claimed: rows.length, sent, retried, failed, disabled });
}
