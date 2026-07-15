import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashVerificationToken } from "@/lib/email-verification";

// Atterrissage du lien de vérification d'adresse envoyé par le tunnel.
// Distinct de /auth/confirm (qui échange un jeton Supabase contre une session) :
// ici l'utilisateur a déjà une session, on ne fait que lever le drapeau
// profiles.email_verified_at qui débloque la publication et les paiements.
//
// Le client admin est nécessaire : le lien peut être ouvert depuis un autre
// appareil, sans cookies de session. Le jeton EST l'autorisation — on ne se sert
// donc jamais d'une identité fournie dans la query.

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/espace?verifie=invalide", origin));
  }

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("user_id, email_verified_at")
    .eq("email_verify_token_hash", hashVerificationToken(token))
    .maybeSingle<{ user_id: string; email_verified_at: string | null }>();

  if (error) {
    console.error("auth/verifier: lookup failed", error.message);
    return NextResponse.redirect(new URL("/espace?verifie=erreur", origin));
  }

  // Jeton inconnu : soit expiré/déjà consommé (il est nullifié à l'usage), soit
  // forgé. Dans les deux cas on ne distingue pas les deux pour l'appelant.
  if (!profile) {
    return NextResponse.redirect(new URL("/espace?verifie=invalide", origin));
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      email_verified_at: profile.email_verified_at ?? new Date().toISOString(),
      // Usage unique : le lien ne peut pas resservir.
      email_verify_token_hash: null,
    })
    .eq("user_id", profile.user_id);

  if (updateError) {
    console.error("auth/verifier: update failed", updateError.message);
    return NextResponse.redirect(new URL("/espace?verifie=erreur", origin));
  }

  return NextResponse.redirect(new URL("/espace?verifie=1", origin));
}
