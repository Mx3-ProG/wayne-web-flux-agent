import "server-only";

// OAuth2 Google (calendrier) — appels REST directs (fetch), pas de dépendance
// googleapis : le besoin se limite à l'échange de code, au refresh et à la
// révocation, largement plus simple que le SDK complet.

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

// Scope minimal : gestion des événements uniquement, jamais la lecture des
// autres calendriers ni les réglages du compte Google (permissions
// minimales, cf. INTEGRATIONS_PLAN.md § G).
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

export type GoogleTokenPayload = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  scope: string;
  expiry: string; // ISO — calculé depuis expires_in, jamais renvoyé tel quel par Google
};

function clientCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("google_calendar_not_configured");
  return { clientId, clientSecret };
}

export function redirectUri(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) throw new Error("missing_site_url");
  return `${site}/api/integrations/google_calendar/oauth/callback`;
}

export function buildAuthUrl(state: string): string {
  const { clientId } = clientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

function withExpiry(json: { access_token: string; refresh_token?: string; token_type: string; scope: string; expires_in: number }): GoogleTokenPayload {
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    token_type: json.token_type,
    scope: json.scope,
    expiry: new Date(Date.now() + json.expires_in * 1000).toISOString(),
  };
}

export async function exchangeCode(code: string): Promise<GoogleTokenPayload> {
  const { clientId, clientSecret } = clientCredentials();
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`google_token_exchange_failed:${res.status}`);
  return withExpiry(await res.json());
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenPayload> {
  const { clientId, clientSecret } = clientCredentials();
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`google_token_refresh_failed:${res.status}`);
  const json = await res.json();
  // Google ne renvoie pas systématiquement un nouveau refresh_token : on
  // conserve l'ancien si absent.
  return { ...withExpiry(json), refresh_token: json.refresh_token ?? refreshToken };
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => {
    // Best-effort : si Google est injoignable, la révocation locale
    // (suppression du secret chiffré) reste le principal facteur de sécurité.
  });
}
