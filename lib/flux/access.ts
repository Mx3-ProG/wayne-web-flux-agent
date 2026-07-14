import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Nombre de générations FLUX offertes pendant l'essai (avant de devoir passer
// à une formule ou un pack). L'utilisateur en essai peut ainsi TESTER FLUX en
// dépensant ses crédits de bienvenue, dans cette limite.
export const FLUX_TRIAL_MAX_USES = 2;

// Préfixe des tool_slug FLUX dans la table `generations` (une ligne par
// génération réussie) — sert à compter les essais consommés.
const FLUX_TOOL_PREFIX = "flux-";

export type FluxAccess =
  | { ok: true; mode: "paid" }
  | { ok: true; mode: "trial"; used: number; remaining: number }
  | { ok: false; reason: "flux_requires_payment" | "flux_trial_exhausted" };

// Accès à FLUX en trois états :
//  - « paid » : souscription posée (subscribed_at) ou achat de pack → illimité ;
//  - « trial » : essai encore actif → autorisé tant que < FLUX_TRIAL_MAX_USES
//    générations FLUX réussies (l'utilisateur dépense ses crédits pour tester) ;
//  - bloqué : essai expiré sans paiement (flux_requires_payment) ou quota
//    d'essai atteint (flux_trial_exhausted).
export async function checkFluxAccess(userId: string): Promise<FluxAccess> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("subscribed_at, trial_ends_at, subscription_status")
    .eq("user_id", userId)
    .maybeSingle<{
      subscribed_at: string | null;
      trial_ends_at: string | null;
      subscription_status: string | null;
    }>();

  if (profile?.subscribed_at) return { ok: true, mode: "paid" };

  const { count: purchases } = await admin
    .from("credit_purchases")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((purchases ?? 0) > 0) return { ok: true, mode: "paid" };

  // Essai encore actif ? (miroir de has_active_access, hors paiement)
  const trialActive =
    (profile?.trial_ends_at &&
      new Date(profile.trial_ends_at).getTime() > Date.now()) ||
    ["active", "trialing", "past_due"].includes(profile?.subscription_status ?? "");
  if (!trialActive) return { ok: false, reason: "flux_requires_payment" };

  // Générations FLUX déjà consommées pendant l'essai.
  const { count: used } = await admin
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .like("tool_slug", `${FLUX_TOOL_PREFIX}%`);
  const usedCount = used ?? 0;
  if (usedCount >= FLUX_TRIAL_MAX_USES) {
    return { ok: false, reason: "flux_trial_exhausted" };
  }
  return {
    ok: true,
    mode: "trial",
    used: usedCount,
    remaining: FLUX_TRIAL_MAX_USES - usedCount,
  };
}
