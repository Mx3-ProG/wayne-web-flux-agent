import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { loadAccountAccess } from "@/lib/account-status";

// Nombre de générations FLUX offertes pendant l'essai (avant de devoir passer
// à une formule ou un pack). L'utilisateur en essai peut ainsi TESTER FLUX en
// dépensant ses crédits de bienvenue, dans cette limite.
export const FLUX_TRIAL_MAX_USES = 2;

// Préfixe des tool_slug FLUX dans la table `generations` (une ligne par
// génération réussie) — sert à compter les essais consommés.
const FLUX_TOOL_PREFIX = "flux-";

// Les deux briques FLUX n'ont pas le même régime :
//   - « site »    : écrire TOUTE la vitrine à partir d'un brief → abonnés payants ;
//   - « prefill » : pré-remplir les textes → testable pendant l'essai.
// C'est ce qui laisse goûter à FLUX sans donner la fonction phare.
export type FluxFeature = "site" | "prefill";

export type FluxAccess =
  | { ok: true; mode: "paid" }
  | { ok: true; mode: "trial"; used: number; remaining: number }
  | {
      ok: false;
      reason:
        // Génération complète demandée par un non-payant (essai en cours inclus).
        | "flux_requires_subscription"
        // Essai expiré, jamais payé.
        | "flux_requires_payment"
        // Le pack a bien été payé, mais sa fenêtre IA de 6 mois est terminée.
        | "flux_credits_expired"
        // Essai en cours mais quota de générations épuisé.
        | "flux_trial_exhausted";
    };

export async function checkFluxAccess(
  userId: string,
  feature: FluxFeature
): Promise<FluxAccess> {
  const account = await loadAccountAccess(userId);
  if (account.status === "subscribed" || account.status === "credits_active") {
    return { ok: true, mode: "paid" };
  }
  if (account.status === "credits_expired") {
    return { ok: false, reason: "flux_credits_expired" };
  }

  // La génération complète ne se teste pas : elle est réservée aux payants,
  // même pendant l'essai.
  if (feature === "site") {
    return { ok: false, reason: "flux_requires_subscription" };
  }

  // Essai encore actif ? Le volet « abonnement » est déjà traité au-dessus, il
  // ne reste donc que la date de fin d'essai.
  if (!account.aiAllowed) return { ok: false, reason: "flux_requires_payment" };

  // Générations FLUX déjà consommées pendant l'essai.
  const { count: used } = await createAdminClient()
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
