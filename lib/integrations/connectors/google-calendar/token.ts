import "server-only";
import type { ConnectorContext } from "@/lib/integrations/types";
import { setIntegrationSecret } from "@/lib/integrations/crypto";
import { refreshAccessToken, type GoogleTokenPayload } from "@/lib/integrations/connectors/google-calendar/oauth";

// Partagé entre le connecteur (push/pull d'événements) et la souscription
// webhook (watch/renew) : les deux ont besoin d'un access_token frais.
export async function validAccessToken(ctx: ConnectorContext): Promise<string> {
  const secret = (await ctx.getSecret()) as GoogleTokenPayload | null;
  if (!secret) throw new Error("not_connected");

  const expiresInMs = new Date(secret.expiry).getTime() - Date.now();
  if (expiresInMs > 60_000) return secret.access_token;

  if (!secret.refresh_token) throw new Error("missing_refresh_token");
  const refreshed = await refreshAccessToken(secret.refresh_token);
  await setIntegrationSecret({
    integrationId: ctx.integrationId,
    authType: "oauth2",
    payload: refreshed,
    expiresAt: refreshed.expiry,
  });
  return refreshed.access_token;
}
