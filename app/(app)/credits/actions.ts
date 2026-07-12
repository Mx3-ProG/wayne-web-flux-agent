"use server";

import { createClient } from "@/lib/supabase/server";
import { getPack } from "@/lib/credit-packs";
import { getStripe } from "@/lib/stripe";

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
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
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
      metadata: { user_id: user.id, pack_id: pack.id },
      customer_email: user.email ?? undefined,
      success_url: `${site}/credits?achat=succes`,
      cancel_url: `${site}/credits?achat=annule`,
    });
    if (!session.url) return { error: "Paiement indisponible. Réessaie." };
    return { url: session.url };
  } catch {
    return { error: "Paiement indisponible. Réessaie dans un instant." };
  }
}
