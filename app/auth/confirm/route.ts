import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Point d'atterrissage des liens envoyés par email (confirmation d'inscription,
// récupération de mot de passe, magic link). Le client @supabase/ssr utilise le
// flux PKCE : le lien revient soit avec `?code=...`, soit avec
// `?token_hash=...&type=...`. Dans les deux cas il faut échanger ce jeton contre
// une session (dépose les cookies) AVANT que l'utilisateur puisse agir.

// N'autorise que des redirections internes (jamais une URL absolue fournie
// dans la query — protection open-redirect).
function safeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/espace";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    if (error) console.error("auth/confirm: exchange failed", error.message);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    ok = !error;
    if (error) console.error("auth/confirm: verifyOtp failed", error.message);
  }

  if (ok) {
    return NextResponse.redirect(new URL(next, origin));
  }

  // Lien invalide ou expiré : retour au login avec un indicateur d'erreur.
  const url = new URL("/login", origin);
  url.searchParams.set("error", "lien_invalide");
  return NextResponse.redirect(url);
}
