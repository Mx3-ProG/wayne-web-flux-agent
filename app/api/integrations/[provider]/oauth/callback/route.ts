import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireActivePage } from "@/lib/integrations/require-page";
import { getConnector } from "@/lib/integrations/registry";
import { setIntegrationSecret } from "@/lib/integrations/crypto";
import { subscribeWebhook } from "@/lib/integrations/connectors/google-calendar/webhook";
import type { ConnectorContext } from "@/lib/integrations/types";

const STATE_COOKIE = "flux_oauth_state";

function noopLogger() {
  return { info() {}, warn() {}, error() {} };
}

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const settingsUrl = new URL("/compte/integrations", process.env.NEXT_PUBLIC_SITE_URL ?? request.url);

  const ctx = await requireActivePage();
  if (!ctx) return NextResponse.redirect(new URL("/login", settingsUrl));

  const connector = getConnector(provider);
  if (!connector) {
    settingsUrl.searchParams.set("error", "unsupported_provider");
    return NextResponse.redirect(settingsUrl);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const storedState = cookieStore.get(STATE_COOKIE)?.value;

  const [storedPageId, storedNonce] = (storedState ?? "").split(":");
  const stateValid = code && state && storedNonce === state && storedPageId === ctx.pageId;

  if (!stateValid) {
    settingsUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const connectorCtx: ConnectorContext = {
      pageId: ctx.pageId,
      integrationId: "",
      getSecret: async () => null,
      logger: noopLogger(),
    };
    const authResult = await connector.authenticate(connectorCtx, {
      kind: "oauth2",
      code,
      redirectUri: `${settingsUrl.origin}/api/integrations/${provider}/oauth/callback`,
    });

    const { data: integration, error: upsertError } = await ctx.supabase
      .from("integrations")
      .upsert(
        {
          page_id: ctx.pageId,
          provider,
          status: "connected",
          capabilities: connector.capabilities,
          external_account_label: authResult.accountLabel ?? null,
          last_error: null,
        },
        { onConflict: "page_id,provider" }
      )
      .select("id")
      .single();
    if (upsertError || !integration) throw new Error(upsertError?.message ?? "integration_upsert_failed");

    await setIntegrationSecret({
      integrationId: integration.id,
      authType: authResult.authType,
      payload: authResult.secretPayload,
      expiresAt: authResult.expiresAt,
    });

    // Souscription webhook best-effort : son échec ne doit pas faire échouer
    // la connexion elle-même (le push depuis l'agenda FLUX fonctionne déjà
    // sans elle — cf. lib/integrations/sync-hooks.ts).
    if (provider === "google_calendar") {
      await subscribeWebhook(ctx.pageId, integration.id).catch((error) => {
        console.error("oauth callback: webhook subscription failed", integration.id, error);
      });
    }

    settingsUrl.searchParams.set("connected", provider);
  } catch (error) {
    console.error("oauth callback failed", provider, error);
    settingsUrl.searchParams.set("error", "connection_failed");
  }

  const response = NextResponse.redirect(settingsUrl);
  response.cookies.delete(STATE_COOKIE);
  return response;
}
