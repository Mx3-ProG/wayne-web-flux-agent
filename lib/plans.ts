// Formules FLUX — l'outil IA de Wayne-Web. 1 crédit = 0,40 € (packs
// dégressifs dans lib/credit-packs.ts).
// Plus de palier gratuit : 4 formules payantes avec un essai de 7 jours
// automatique à l'inscription (les 100 crédits de bienvenue servent de
// carburant d'essai). Essai expiré sans souscription = lecture seule (le site
// reste en ligne, les actions à crédits sont bloquées côté SQL).
// Stripe est l'autorité de facturation. Les valeurs ci-dessous sont l'autorité
// produit côté application et doivent correspondre aux Prices récurrents Stripe.

import type { Plan, Profile } from "@/lib/types";

export const ACTIVE_SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
] as const;

export function isActiveSubscriptionStatus(
  status: string | null | undefined
): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.some((active) => active === status);
}

// Coût d'une publication de nouvelle version de la vitrine (miroir de la
// valeur codée dans publish_page, migration 00013).
export const PUBLISH_COST = 5;

// Coûts en crédits des parcours FLUX (débit atomique via spend_credits).
export const OFFER_CREATE_COST = 15; // création d'offre dans la limite du forfait
export const OFFER_EXTRA_COST = 25; // création d'offre au-delà de la limite
export const PRODUCT_CREATE_COST = 15; // passage du tunnel produits (jusqu'à 8 produits)
export const CATEGORY_CREATE_COST = 15; // nouvelle catégorie (la 1re du compte est offerte)
export const PRODUCT_ADD_COST = 5; // ajout d'un produit (gestionnaire /produits)
export const RESERVATION_ADD_COST = 1; // ajout d'une réservation
export const VITRINE_ASSIST_COST = 10; // assistant vitrine FLUX (confirmation finale)
export const SITE_GENERATE_COST = 50; // génération complète de la vitrine par brief (FLUX)
export const CONTEXT_CHANGE_COST = 5; // modification du contexte FLUX (1re création gratuite)

// Durée de l'essai offert sur toutes les formules (miroir du default SQL de
// profiles.trial_ends_at, migration 00013).
export const TRIAL_DAYS = 7;

type PlanLimits = {
  offers: number;
  projects: number;
  subpages: number; // sous-pages par projet (table site_pages)
  customDomain: boolean;
  monthlyCredits: number;
  priceEur: number; // €/mois
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  basique: { offers: 2, projects: 1, subpages: 2, customDomain: false, monthlyCredits: 20, priceEur: 9 },
  pro: { offers: 5, projects: 2, subpages: 5, customDomain: false, monthlyCredits: 100, priceEur: 29 },
  business: { offers: 12, projects: 5, subpages: 12, customDomain: true, monthlyCredits: 300, priceEur: 69 },
  entreprise: { offers: 20, projects: 10, subpages: 20, customDomain: true, monthlyCredits: 500, priceEur: 89 },
};

export const PLAN_LABEL: Record<Plan, string> = {
  basique: "Basique FLUX",
  pro: "Pro",
  business: "Business",
  entreprise: "Entreprise",
};

// Ordre d'affichage sur la page pricing (/formules).
export const FLUX_PLANS: Plan[] = ["basique", "pro", "business", "entreprise"];

const PLAN_PRICE_ENV: Record<Plan, readonly string[]> = {
  basique: ["STRIPE_PRICE_BASIQUE", "STRIPE_BASIQUE_FORFAIT"],
  pro: ["STRIPE_PRICE_PRO", "STRIPE_PRO_FORFAIT"],
  business: ["STRIPE_PRICE_BUSINESS", "STRIPE_BUSINESS_FORFAIT"],
  entreprise: ["STRIPE_PRICE_ENTREPRISE", "STRIPE_ENTREPRISE_FORFAIT"],
};

export function stripePriceId(plan: Plan): string | null {
  for (const envName of PLAN_PRICE_ENV[plan]) {
    const priceId = process.env[envName];
    if (priceId) return priceId;
  }
  return null;
}

export function planFromStripePrice(priceId: string): Plan | null {
  return FLUX_PLANS.find((plan) => stripePriceId(plan) === priceId) ?? null;
}

// Accès actif = essai en cours ou souscription posée. Miroir TS de la
// fonction SQL has_active_access (qui reste la seule autorité pour bloquer
// les débits) — celui-ci ne sert qu'à l'affichage.
export function hasActiveAccess(
  profile: Pick<Profile, "trial_ends_at" | "subscription_status">
): boolean {
  if (isActiveSubscriptionStatus(profile.subscription_status)) {
    return true;
  }
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

export function subpageLimit(plan: Plan): number {
  return PLAN_LIMITS[plan]?.subpages ?? PLAN_LIMITS.basique.subpages;
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
