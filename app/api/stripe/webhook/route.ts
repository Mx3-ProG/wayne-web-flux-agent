import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getPack } from "@/lib/credit-packs";
import { createAdminClient } from "@/lib/supabase/admin";

// Webhook Stripe : crédite les packs achetés (checkout.session.completed).
// Idempotent : grant_credit_purchase refuse une session déjà traitée
// (unicité de stripe_session_id), les retries Stripe sont donc sans effet.
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  // Corps BRUT obligatoire pour la vérification de signature.
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    const userId = session.metadata?.user_id;
    const packId = session.metadata?.pack_id;
    // Le pack est re-résolu côté serveur : on ne crédite jamais un montant
    // venu du metadata.
    const pack = packId ? getPack(packId) : undefined;
    if (!userId || !pack) {
      return NextResponse.json({ error: "invalid_metadata" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.rpc("grant_credit_purchase", {
      uid: userId,
      session_id: session.id,
      pack: pack.id,
      pack_credits: pack.credits,
      amount: session.amount_total ?? pack.priceCents,
    });
    if (error) {
      // 500 → Stripe retentera ; grant_credit_purchase est idempotent.
      return NextResponse.json({ error: "grant_failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
