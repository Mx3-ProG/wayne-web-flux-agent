"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { FLUX_PLANS, stripePriceId } from "@/lib/plans";
import { ACTIVE_SUBSCRIPTION_STATUSES } from "@/lib/billing";
import type { Plan, Profile } from "@/lib/types";

function isPlan(value: string): value is Plan {
  return FLUX_PLANS.includes(value as Plan);
}

export async function subscribeToPlan(formData: FormData) {
  const requestedPlan = String(formData.get("plan") ?? "");
  if (!isPlan(requestedPlan)) redirect("/formules?paiement=offre-invalide");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const stripe = getStripe();
  const price = stripePriceId(requestedPlan);
  if (!stripe || !price) redirect("/formules?paiement=indisponible");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, subscription_status")
    .eq("user_id", user.id)
    .single<Pick<Profile, "stripe_customer_id" | "subscription_status">>();

  if (
    profile?.stripe_customer_id &&
    ACTIVE_SUBSCRIPTION_STATUSES.includes(profile.subscription_status ?? "")
  ) {
    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.flux-wayne.com"}/compte/facturation`,
    });
    redirect(portal.url);
  }

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

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.flux-wayne.com";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    metadata: { user_id: user.id, plan: requestedPlan, kind: "subscription" },
    subscription_data: { metadata: { user_id: user.id, plan: requestedPlan } },
    billing_address_collection: "required",
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    tax_id_collection: { enabled: true },
    allow_promotion_codes: true,
    consent_collection: { terms_of_service: "required" },
    success_url: `${site}/paiement/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/formules?paiement=annule`,
  });
  if (!session.url) redirect("/formules?paiement=indisponible");
  redirect(session.url);
}
