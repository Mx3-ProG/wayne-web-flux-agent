"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import type { Profile } from "@/lib/types";

export async function openBillingPortal() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single<Pick<Profile, "stripe_customer_id">>();
  const stripe = getStripe();
  if (!stripe || !profile?.stripe_customer_id) redirect("/compte/facturation?erreur=indisponible");

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.flux-wayne.com"}/compte/facturation`,
  });
  redirect(session.url);
}
