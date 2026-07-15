import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getPack, stripeCreditPriceId } from "@/lib/credit-packs";
import {
  FLUX_PLANS,
  isActiveSubscriptionStatus,
  stripePriceId,
} from "@/lib/plans";
import type { Plan, Profile } from "@/lib/types";

const inputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("subscription"), id: z.enum(FLUX_PLANS as [Plan, ...Plan[]]) }),
  z.object({ kind: z.literal("credits"), id: z.string().min(1).max(40) }),
]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Offre invalide." }, { status: 400 });
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Paiement indisponible." }, { status: 503 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, subscription_status, email_verified_at")
    .eq("user_id", user.id)
    .single<
      Pick<
        Profile,
        "stripe_customer_id" | "subscription_status" | "email_verified_at"
      >
    >();
  // Le tunnel ouvre la session avant la preuve de possession de l'adresse : on
  // n'encaisse pas quelqu'un qu'on ne sait pas joindre (facture, reçu, litige).
  if (!profile?.email_verified_at) {
    return NextResponse.json(
      {
        error: "Vérifie ton adresse email avant de payer.",
        code: "email_not_verified",
      },
      { status: 403 }
    );
  }
  if (
    parsed.data.kind === "subscription" &&
    isActiveSubscriptionStatus(profile?.subscription_status)
  ) {
    return NextResponse.json({ error: "Un abonnement est déjà actif.", code: "already_subscribed" }, { status: 409 });
  }

  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    const { error } = await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: "Impossible de préparer le paiement." }, { status: 500 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.flux-wayne.com";
  const common = {
    // Stripe SDK v22 nomme le mode Custom Checkout `elements`.
    ui_mode: "elements" as const,
    customer: customerId,
    // Enregistre l'adresse saisie sur le Customer et permet à Stripe Tax de
    // l'utiliser si le calcul automatique est activé plus tard.
    customer_update: { address: "auto" as const },
    client_reference_id: user.id,
    billing_address_collection: "required" as const,
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    return_url: `${site}/paiement/confirmation?session_id={CHECKOUT_SESSION_ID}`,
  };

  try {
    const planPrice = parsed.data.kind === "subscription" ? stripePriceId(parsed.data.id) : null;
    if (parsed.data.kind === "subscription" && !planPrice) {
      return NextResponse.json({ error: "Cette formule n’est pas encore configurée." }, { status: 503 });
    }
    const session = parsed.data.kind === "subscription"
      ? await stripe.checkout.sessions.create({
          ...common,
          mode: "subscription",
          line_items: [{ price: planPrice!, quantity: 1 }],
          metadata: { user_id: user.id, plan: parsed.data.id, kind: "subscription", terms_version: "2026-07-14" },
          subscription_data: { metadata: { user_id: user.id, plan: parsed.data.id } },
        })
      : await (async () => {
          const pack = getPack(parsed.data.id);
          if (!pack) return null;
          const packPrice = stripeCreditPriceId(pack.id);
          if (!packPrice) return null;
          return stripe.checkout.sessions.create({
            ...common,
            mode: "payment",
            line_items: [{ price: packPrice, quantity: 1 }],
            metadata: { user_id: user.id, pack_id: pack.id, kind: "credits", terms_version: "2026-07-14" },
          });
        })();
    if (!session?.client_secret) {
      return NextResponse.json({ error: "Paiement indisponible." }, { status: 503 });
    }
    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error("Custom Checkout Session creation failed", error);
    return NextResponse.json({ error: "Paiement indisponible. Réessaie dans un instant." }, { status: 500 });
  }
}
