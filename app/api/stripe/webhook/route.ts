import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getPack } from "@/lib/credit-packs";
import { createAdminClient } from "@/lib/supabase/admin";
import { monthlyCreditsForPrice, stripeId, subscriptionSnapshot } from "@/lib/billing";

async function syncSubscription(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
) {
  const snapshot = subscriptionSnapshot(subscription);
  const userId = subscription.metadata.user_id;
  const match = userId
    ? { column: "user_id", value: userId }
    : snapshot.stripe_customer_id
      ? { column: "stripe_customer_id", value: snapshot.stripe_customer_id }
      : null;
  if (!match) throw new Error("subscription_without_owner");

  const update = {
    stripe_subscription_id: snapshot.stripe_subscription_id,
    stripe_customer_id: snapshot.stripe_customer_id,
    stripe_price_id: snapshot.stripe_price_id,
    subscription_status: snapshot.subscription_status,
    current_period_end: snapshot.current_period_end,
    cancel_at_period_end: snapshot.cancel_at_period_end,
    ...(snapshot.plan ? { plan: snapshot.plan } : {}),
    ...(["active", "trialing"].includes(snapshot.subscription_status)
      ? { subscribed_at: new Date().toISOString() }
      : {}),
  };
  const { error } = await admin
    .from("profiles")
    .update(update)
    .eq(match.column, match.value);
  if (error) throw error;
}

async function grantCreditPack(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session
) {
  if (session.metadata?.kind !== "credits" || session.payment_status !== "paid") return;
  const userId = session.metadata.user_id;
  const pack = session.metadata.pack_id ? getPack(session.metadata.pack_id) : undefined;
  if (!userId || !pack) throw new Error("invalid_credit_metadata");
  const { error } = await admin.rpc("grant_credit_purchase", {
    uid: userId,
    session_id: session.id,
    pack: pack.id,
    pack_credits: pack.credits,
    amount: session.amount_total ?? pack.priceCents,
  });
  if (error) throw error;
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: claimed, error: claimError } = await admin.rpc("claim_stripe_event", {
    eid: event.id,
    etype: event.type,
  });
  if (claimError) return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  if (!claimed) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        await grantCreditPack(admin, session);
        if (session.metadata?.kind === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(stripeId(session.subscription)!);
          await syncSubscription(admin, subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(admin, event.data.object);
        break;
      case "invoice.paid": {
        const invoice = event.data.object;
        const subscriptionId = stripeId(invoice.parent?.subscription_details?.subscription);
        if (!subscriptionId) break;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscription(admin, subscription);
        if (!["subscription_create", "subscription_cycle"].includes(invoice.billing_reason ?? "")) break;
        const priceId = subscription.items.data[0]?.price.id;
        const grant = priceId ? monthlyCreditsForPrice(priceId) : null;
        const userId = subscription.metadata.user_id;
        if (!grant || !userId) throw new Error("invoice_without_plan_owner");
        const { error } = await admin.rpc("grant_subscription_credits", {
          uid: userId,
          invoice_id: invoice.id,
          billed_plan: grant.plan,
          plan_credits: grant.credits,
        });
        if (error) throw error;
        break;
      }
      case "invoice.payment_failed": {
        const subscriptionId = stripeId(event.data.object.parent?.subscription_details?.subscription);
        if (subscriptionId) {
          await syncSubscription(admin, await stripe.subscriptions.retrieve(subscriptionId));
        }
        break;
      }
    }
    await admin
      .from("stripe_webhook_events")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("event_id", event.id);
  } catch (error) {
    console.error("Stripe webhook processing failed", event.id, event.type, error);
    await admin
      .from("stripe_webhook_events")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("event_id", event.id);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
