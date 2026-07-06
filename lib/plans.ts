// Formules FLUX — l'outil IA de Wayne-Web. 1 crédit ≈ 1 €.
// Gratuit : 100 crédits une seule fois à l'inscription, sans recharge.
// Les formules payantes rechargent tous les 30 jours (apply_plan_topup en SQL).
// Pas de Stripe pour l'instant : la bascule de plan se fait manuellement
// (UPDATE profiles SET plan = ...).

import type { Plan } from "@/lib/types";

// Coût d'une publication de nouvelle version de la vitrine (miroir de la
// valeur codée dans publish_page, migration 00012).
export const PUBLISH_COST = 5;

type PlanLimits = {
  offers: number;
  projects: number;
  customDomain: boolean;
  monthlyCredits: number; // 0 = pas de recharge (gratuit)
  priceEur: number; // €/mois
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { offers: 2, projects: 1, customDomain: false, monthlyCredits: 0, priceEur: 0 },
  pro: { offers: 5, projects: 3, customDomain: true, monthlyCredits: 500, priceEur: 60 },
  business: { offers: 12, projects: 5, customDomain: true, monthlyCredits: 1500, priceEur: 150 },
  entreprise: { offers: 30, projects: 10, customDomain: true, monthlyCredits: 5000, priceEur: 300 },
};

export const PLAN_LABEL: Record<Plan, string> = {
  free: "Gratuit",
  pro: "Pro",
  business: "Business",
  entreprise: "Entreprise",
};

// Ordre d'affichage sur la page pricing (/formules).
export const FLUX_PLANS: Plan[] = ["free", "pro", "business", "entreprise"];

export function offerLimit(plan: Plan): number {
  return PLAN_LIMITS[plan]?.offers ?? PLAN_LIMITS.free.offers;
}

export function projectLimit(plan: Plan): number {
  return PLAN_LIMITS[plan]?.projects ?? PLAN_LIMITS.free.projects;
}

export function canUseCustomDomain(plan: Plan): boolean {
  return PLAN_LIMITS[plan]?.customDomain ?? false;
}

// Personnalisation avancée de la vitrine (sections/blocs, thèmes premium,
// retrait du branding…). Construite ouverte à tous : passer le flag à true au
// déploiement pour la réserver aux formules payantes.
const ADVANCED_CUSTOMIZATION_GATED = false;

export function canUseAdvancedCustomization(plan: Plan): boolean {
  if (!ADVANCED_CUSTOMIZATION_GATED) return true;
  return plan !== "free";
}

export function canUsePremiumThemes(plan: Plan): boolean {
  if (!ADVANCED_CUSTOMIZATION_GATED) return true;
  return plan !== "free";
}

export function canHideBranding(plan: Plan): boolean {
  if (!ADVANCED_CUSTOMIZATION_GATED) return true;
  return plan !== "free";
}
