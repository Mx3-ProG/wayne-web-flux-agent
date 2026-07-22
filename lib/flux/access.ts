import "server-only";

import { loadAccountAccess } from "@/lib/account-status";

// Accès à FLUX : le crédit est la seule limite. Plus de distinction entre
// pré-remplissage et génération complète, plus de quota d'essai — dès qu'il
// reste des crédits utilisables, toutes les fonctions IA sont ouvertes, et
// c'est le débit (spend_credits, autorité SQL) qui tranche au moment de l'appel.
// Seule exception : la fenêtre IA de 6 mois d'un pack acheté, qui reste fermée
// une fois écoulée (CREDITS_AI_WINDOW_MONTHS).
export type FluxAccess =
  | { ok: true }
  | {
      ok: false;
      reason:
        // Compte suspendu par la modération (KarlMada). Réversible par un admin.
        | "account_suspended"
        // Le pack a bien été payé, mais sa fenêtre IA de 6 mois est terminée.
        | "flux_credits_expired"
        // Essai terminé et solde vide.
        | "flux_requires_payment";
    };

export async function checkFluxAccess(userId: string): Promise<FluxAccess> {
  const account = await loadAccountAccess(userId);

  // Suspension prioritaire : ni message de paiement, ni de fenêtre écoulée.
  if (account.status === "suspended") {
    return { ok: false, reason: "account_suspended" };
  }
  // Testé avant aiAllowed : la fenêtre écoulée mérite son propre message, les
  // crédits restants servant encore aux actions non-IA.
  if (account.status === "credits_expired") {
    return { ok: false, reason: "flux_credits_expired" };
  }
  if (!account.aiAllowed) return { ok: false, reason: "flux_requires_payment" };
  return { ok: true };
}
