// Forfaits FLUX. En v1 la monétisation reste gratuite (crédits) ; le forfait
// « plus » débloque plus d'offres. Le paiement (Stripe) viendra en v2 et se
// contentera de basculer profiles.plan.

import type { Plan } from "@/lib/types";

export const PLAN_LIMITS: Record<Plan, { offers: number }> = {
  free: { offers: 2 },
  plus: { offers: 5 },
};

export const PLAN_LABEL: Record<Plan, string> = {
  free: "Gratuit",
  plus: "Plus",
};

export function offerLimit(plan: Plan): number {
  return PLAN_LIMITS[plan]?.offers ?? PLAN_LIMITS.free.offers;
}
