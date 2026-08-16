import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActivePage } from "@/lib/integrations/require-page";
import { getConnector } from "@/lib/integrations/registry";
import { getIntegrationSecret } from "@/lib/integrations/crypto";
import type { ConnectorContext } from "@/lib/integrations/types";

function noopLogger() {
  return { info() {}, warn() {}, error() {} };
}

// Déconnexion : révocation du token chez le fournisseur + suppression du
// secret chiffré, mais conservation de la ligne `integrations` (status
// 'disconnected') et des `external_entity_mappings` — cf.
// INTEGRATIONS_PLAN.md § G "Offboarding d'une intégration". Les données déjà
// synchronisées (bookings/customers) restent en base.
export async function POST(_request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const ctx = await requireActivePage();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { provider } = await params;
  const connector = getConnector(provider);
  if (!connector) return NextResponse.json({ error: "unsupported_provider" }, { status: 400 });

  const { data: integration } = await ctx.supabase
    .from("integrations")
    .select("id")
    .eq("page_id", ctx.pageId)
    .eq("provider", provider)
    .maybeSingle();
  if (!integration) return NextResponse.json({ error: "not_connected" }, { status: 404 });

  const connectorCtx: ConnectorContext = {
    pageId: ctx.pageId,
    integrationId: integration.id,
    getSecret: () => getIntegrationSecret(integration.id),
    logger: noopLogger(),
  };

  try {
    await connector.disconnect(connectorCtx);
  } catch (error) {
    console.error("disconnect: provider revocation failed", provider, error);
    // On continue quand même : la révocation locale du secret prime.
  }

  const admin = createAdminClient();
  await admin.from("integration_credentials").delete().eq("integration_id", integration.id);
  const { error } = await ctx.supabase
    .from("integrations")
    .update({ status: "disconnected" })
    .eq("id", integration.id);
  if (error) return NextResponse.json({ error: "disconnect_failed" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
