// Forfaits FLUX. En v1 la monétisation reste gratuite (crédits) ; le forfait
// « plus » débloque plus d'offres. Le paiement (Stripe) viendra en v2 et se
// contentera de basculer profiles.plan.

import type { Plan } from "@/lib/types";

type PlanLimits = { offers: number; projects: number; customDomain: boolean };

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { offers: 2, projects: 1, customDomain: false },
  plus: { offers: 5, projects: 3, customDomain: true },
};

export const PLAN_LABEL: Record<Plan, string> = {
  free: "Gratuit",
  plus: "Plus",
};

export function offerLimit(plan: Plan): number {
  return PLAN_LIMITS[plan]?.offers ?? PLAN_LIMITS.free.offers;
}

export function projectLimit(plan: Plan): number {
  return PLAN_LIMITS[plan]?.projects ?? PLAN_LIMITS.free.projects;
}

export function canUseCustomDomain(plan: Plan): boolean {
  return PLAN_LIMITS[plan]?.customDomain ?? false;
}
