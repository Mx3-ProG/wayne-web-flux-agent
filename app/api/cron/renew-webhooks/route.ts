import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renewWebhookIfNeeded } from "@/lib/integrations/connectors/google-calendar/webhook";

// Les canaux "watch" Google Calendar expirent (pas d'endpoint pour les
// prolonger, cf. webhook.ts) : ce cron quotidien recrée ceux qui arrivent à
// échéance sous 48h. Même convention Bearer CRON_SECRET que les autres
// workers (translate-jobs, process-imports).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: integrations, error } = await admin
    .from("integrations")
    .select("id, page_id, metadata")
    .eq("provider", "google_calendar")
    .eq("status", "connected");
  if (error) return NextResponse.json({ error: "fetch_failed" }, { status: 500 });

  const results: { integrationId: string; outcome: string }[] = [];
  for (const integration of integrations ?? []) {
    const expiration = (integration.metadata as { webhook_expiration?: string | null } | null)?.webhook_expiration ?? null;
    try {
      const outcome = await renewWebhookIfNeeded(integration.page_id, integration.id, expiration);
      results.push({ integrationId: integration.id, outcome });
    } catch (renewError) {
      console.error("renew-webhooks: renewal failed", integration.id, renewError);
      results.push({ integrationId: integration.id, outcome: "error" });
    }
  }

  return NextResponse.json({ ok: true, checked: results.length, results });
}
