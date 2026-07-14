"use server";

import { createClient } from "@/lib/supabase/server";
import { getPack } from "@/lib/credit-packs";
import { getStripe } from "@/lib/stripe";
import type { Profile } from "@/lib/types";

// Crée une session Stripe Checkout pour un pack de crédits.
// Les crédits sont ajoutés par le webhook (checkout.session.completed),
// jamais ici : le retour sur /credits?achat=succes n'est qu'informatif.
export async function createCheckoutSession(
  packId: string
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };

  const pack = getPack(packId);
  if (!pack) return { error: "Pack introuvable." };

  const stripe = getStripe();
  if (!stripe) {
    return {
      error:
        "Le paiement en ligne arrive très bientôt. Tes crédits actuels restent utilisables.",
    };
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.flux-wayne.com";

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single<Pick<Profile, "stripe_customer_id">>();
    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: pack.priceCents,
            product_data: {
              name: `${pack.credits} crédits FLUX — ${pack.label}`,
            },
          },
        },
      ],
      metadata: { user_id: user.id, pack_id: pack.id, kind: "credits" },
      billing_address_collection: "required",
      automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
      tax_id_collection: { enabled: true },
      consent_collection: { terms_of_service: "required" },
      success_url: `${site}/paiement/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/credits?achat=annule`,
    });
    if (!session.url) return { error: "Paiement indisponible. Réessaie." };
    return { url: session.url };
  } catch {
    return { error: "Paiement indisponible. Réessaie dans un instant." };
  }
}
