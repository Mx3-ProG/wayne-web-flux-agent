import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Verrou payant FLUX. Décision produit : l'IA n'aide AUCUN compte gratuit.
// L'essai de 7 jours (has_active_access, qui autorise le reste de l'app :
// publication, offres…) ne débloque PAS FLUX. Il faut une souscription posée
// (profiles.subscribed_at, écrit par le webhook Stripe sur active/trialing) OU
// au moins un achat de pack de crédits (credit_purchases).
export async function hasPaidFlux(userId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("subscribed_at")
    .eq("user_id", userId)
    .maybeSingle<{ subscribed_at: string | null }>();
  if (profile?.subscribed_at) return true;

  const { count } = await admin
    .from("credit_purchases")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}

export type FluxAccessError = "flux_requires_payment";

// À appeler en tête de toute action FLUX, avant tout débit de crédits.
export async function requirePaidFlux(
  userId: string
): Promise<{ error?: FluxAccessError }> {
  return (await hasPaidFlux(userId)) ? {} : { error: "flux_requires_payment" };
}
