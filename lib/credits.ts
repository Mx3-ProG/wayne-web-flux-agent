import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Erreurs typées renvoyées par spend_credits (SQL, migration 00018) :
// - subscription_required : essai 7 jours expiré sans souscription
// - insufficient_credits : solde insuffisant
export type CreditError =
  | "insufficient_credits"
  | "subscription_required"
  | "spend_failed";

// Débit atomique via la fonction SQL spend_credits (advisory lock +
// has_active_access). Même pattern que app/api/generate/route.ts.
export async function spendCredits(
  userId: string,
  cost: number,
  reason: string
): Promise<{ error?: CreditError }> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("spend_credits", {
    uid: userId,
    cost,
    why: reason,
  });
  if (!error) return {};
  if (error.message.includes("subscription_required")) {
    return { error: "subscription_required" };
  }
  if (error.message.includes("insufficient_credits")) {
    return { error: "insufficient_credits" };
  }
  return { error: "spend_failed" };
}

// Remboursement (l'action métier a échoué après le débit).
export async function refundCredits(
  userId: string,
  cost: number,
  reason: string
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("credit_ledger").insert({
    user_id: userId,
    delta: cost,
    reason,
  });
}
