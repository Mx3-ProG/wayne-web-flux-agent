import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomCheckout } from "@/components/checkout/custom-checkout";
import {
  FLUX_PLANS,
  PLAN_LABEL,
  PLAN_LIMITS,
  isActiveSubscriptionStatus,
} from "@/lib/plans";
import type { Plan } from "@/lib/types";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Finaliser ma formule" };

export default async function PlanCheckoutPage({ params }: { params: Promise<{ plan: string }> }) {
  const { plan: rawPlan } = await params;
  if (!FLUX_PLANS.includes(rawPlan as Plan)) notFound();
  const plan = rawPlan as Plan;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/checkout/formule/${plan}`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("user_id", user.id)
    .single<Pick<Profile, "subscription_status">>();
  if (isActiveSubscriptionStatus(profile?.subscription_status)) {
    redirect("/compte/facturation");
  }
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLIC_KEY;
  if (!key) redirect("/formules?paiement=indisponible");
  const limits = PLAN_LIMITS[plan];
  return <CustomCheckout publishableKey={key} product={{
    kind: "subscription", id: plan, title: PLAN_LABEL[plan], subtitle: "Ta formule mensuelle pour construire, publier et faire évoluer ta présence en ligne.",
    price: `${limits.priceEur} €`, cadence: " / mois",
    features: [`${limits.monthlyCredits} crédits à chaque facture payée`, `${limits.projects} vitrine${limits.projects > 1 ? "s" : ""}`, `${limits.offers} offres actives`, limits.customDomain ? "Domaine personnalisé" : "Adresse FLUX incluse", "Résiliation depuis ton espace"],
  }} />;
}
