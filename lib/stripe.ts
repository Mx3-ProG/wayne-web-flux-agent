import "server-only";
import Stripe from "stripe";

// Singleton Stripe côté serveur. Tant que STRIPE_SECRET_KEY n'est pas posée,
// getStripe() renvoie null et les actions répondent par une erreur propre
// (« paiement bientôt disponible ») au lieu de planter au build.
let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}
