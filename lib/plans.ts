// Formules FLUX — l'outil IA de Wayne-Web. 1 crédit ≈ 1 €.
// Plus de palier gratuit : 4 formules payantes avec un essai de 7 jours
// automatique à l'inscription (les 100 crédits de bienvenue servent de
// carburant d'essai). Essai expiré sans souscription = lecture seule (le site
// reste en ligne, les actions à crédits sont bloquées côté SQL).
// Pas de Stripe pour l'instant : la souscription se pose manuellement
// (UPDATE profiles SET subscribed_at = now(), plan = ...).

import type { Plan, Profile } from "@/lib/types";

// Coût d'une publication de nouvelle version de la vitrine (miroir de la
// valeur codée dans publish_page, migration 00013).
export const PUBLISH_COST = 5;

// Durée de l'essai offert sur toutes les formules (miroir du default SQL de
// profiles.trial_ends_at, migration 00013).
export const TRIAL_DAYS = 7;

type PlanLimits = {
  offers: number;
  projects: number;
  customDomain: boolean;
  monthlyCredits: number;
  priceEur: number; // €/mois
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  basique: { offers: 2, projects: 1, customDomain: false, monthlyCredits: 100, priceEur: 9 },
  pro: { offers: 5, projects: 3, customDomain: true, monthlyCredits: 500, priceEur: 29 },
  business: { offers: 12, projects: 5, customDomain: true, monthlyCredits: 1500, priceEur: 69 },
  entreprise: { offers: 30, projects: 10, customDomain: true, monthlyCredits: 3000, priceEur: 89 },
};

export const PLAN_LABEL: Record<Plan, string> = {
  basique: "Basique FLUX",
  pro: "Pro",
  business: "Business",
  entreprise: "Entreprise",
};

// Ordre d'affichage sur la page pricing (/formules).
export const FLUX_PLANS: Plan[] = ["basique", "pro", "business", "entreprise"];

// Accès actif = essai en cours ou souscription posée. Miroir TS de la
// fonction SQL has_active_access (qui reste la seule autorité pour bloquer
// les débits) — celui-ci ne sert qu'à l'affichage.
export function hasActiveAccess(
  profile: Pick<Profile, "trial_ends_at" | "subscribed_at">
): boolean {
  if (profile.subscribed_at) return true;
  return new Date(profile.trial_ends_at).getTime() > Date.now();
}

export function trialDaysLeft(
  profile: Pick<Profile, "trial_ends_at">
): number {
  const ms = new Date(profile.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400_000));
}

export function offerLimit(plan: Plan): number {
  return PLAN_LIMITS[plan]?.offers ?? PLAN_LIMITS.basique.offers;
}

export function projectLimit(plan: Plan): number {
  return PLAN_LIMITS[plan]?.projects ?? PLAN_LIMITS.basique.projects;
}

export function canUseCustomDomain(plan: Plan): boolean {
  return PLAN_LIMITS[plan]?.customDomain ?? false;
}

// Personnalisation avancée de la vitrine (sections/blocs, thèmes premium,
// retrait du branding…). Construite ouverte à tous : passer le flag à true au
// déploiement pour la réserver aux paliers supérieurs.
const ADVANCED_CUSTOMIZATION_GATED = false;

export function canUseAdvancedCustomization(plan: Plan): boolean {
  if (!ADVANCED_CUSTOMIZATION_GATED) return true;
  return plan !== "basique";
}

export function canUsePremiumThemes(plan: Plan): boolean {
  if (!ADVANCED_CUSTOMIZATION_GATED) return true;
  return plan !== "basique";
}

export function canHideBranding(plan: Plan): boolean {
  if (!ADVANCED_CUSTOMIZATION_GATED) return true;
  return plan === "business" || plan === "entreprise";
}
