import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireActivePage } from "@/lib/integrations/require-page";
import { getConnector } from "@/lib/integrations/registry";

const STATE_COOKIE = "flux_oauth_state";

// Redirige vers l'écran de consentement du fournisseur. L'état anti-CSRF
// (nonce + page active) est stocké dans un cookie httpOnly, jamais dans une
// table : sa seule fonction est de survivre le round-trip vers le
// fournisseur et d'être comparé au retour (voir oauth/callback).
export async function GET(_request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const ctx = await requireActivePage();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { provider } = await params;
  const connector = getConnector(provider);
  if (!connector?.buildAuthorizationUrl) {
    return NextResponse.json({ error: "unsupported_provider" }, { status: 400 });
  }

  const nonce = randomUUID();
  const stateValue = `${ctx.pageId}:${nonce}`;

  let authUrl: string;
  try {
    // Échoue si les identifiants OAuth du fournisseur (variables
    // d'environnement) ne sont pas configurés côté serveur — une erreur de
    // déploiement, pas une erreur utilisateur, mais qui ne doit pas faire
    // planter la route avec un 500 muet pour autant.
    authUrl = connector.buildAuthorizationUrl(nonce);
  } catch (error) {
    console.error("connect: buildAuthorizationUrl failed", provider, error);
    return NextResponse.json({ error: "provider_not_configured" }, { status: 503 });
  }

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(STATE_COOKIE, stateValue, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/integrations",
  });
  return response;
}
