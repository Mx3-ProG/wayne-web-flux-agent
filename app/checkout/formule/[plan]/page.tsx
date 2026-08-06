import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomCheckout } from "@/components/checkout/custom-checkout";
import { VerifyEmailGate } from "@/components/checkout/verify-email-gate";
import {
  FLUX_PLANS,
  PLAN_LABEL,
  PLAN_LIMITS,
  isActiveSubscriptionStatus,
} from "@/lib/plans";
import type { Plan } from "@/lib/types";
import type { Profile } from "@/lib/types";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale } from "@/lib/i18n/config";
import { formatCurrency } from "@/lib/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "billing")).checkout.metaTitleSubscription };
}

export default async function PlanCheckoutPage({ params }: { params: Promise<{ plan: string }> }) {
  const { plan: rawPlan } = await params;
  if (!FLUX_PLANS.includes(rawPlan as Plan)) notFound();
  const plan = rawPlan as Plan;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/checkout/formule/${plan}`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, email_verified_at")
    .eq("user_id", user.id)
    .single<Pick<Profile, "subscription_status" | "email_verified_at">>();
  if (isActiveSubscriptionStatus(profile?.subscription_status)) {
    redirect("/compte/facturation");
  }
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLIC_KEY;
  if (!key) redirect("/formules?paiement=indisponible");
  const limits = PLAN_LIMITS[plan];
  const locale = await getAccountLocale(supabase, user.id);
  const t = (await getDictionary(locale, "billing")).checkout;

  // Même verrou que l'API de création de session : sans adresse prouvée le
  // formulaire Stripe ne servirait à rien (403 au premier appel).
  if (!profile?.email_verified_at) {
    return (
      <VerifyEmailGate
        email={user.email ?? null}
        backHref="/formules"
        t={(await getDictionary(locale, "dashboard")).emailVerification}
        tCheckout={t}
      />
    );
  }

  return (
    <CustomCheckout
      publishableKey={key}
      locale={locale}
      t={t}
      product={{
        kind: "subscription",
        id: plan,
        title: PLAN_LABEL[plan],
        subtitle: t.planSubtitle,
        price: formatCurrency(locale, limits.priceEur),
        cadence: t.perMonth,
        features: [
          t.planFeatureMonthlyCredits.replace("{credits}", String(limits.monthlyCredits)),
          (limits.projects > 1 ? t.planFeatureProjectsPlural : t.planFeatureProjectsSingular).replace(
            "{count}",
            String(limits.projects)
          ),
          t.planFeatureOffers.replace("{count}", String(limits.offers)),
          limits.customDomain ? t.planFeatureCustomDomain : t.planFeatureFluxDomain,
          t.planFeatureCancelAnytime,
        ],
      }}
    />
  );
}
