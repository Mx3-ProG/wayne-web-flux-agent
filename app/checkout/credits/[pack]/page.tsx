import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomCheckout } from "@/components/checkout/custom-checkout";
import { getPack, packUnitPrice } from "@/lib/credit-packs";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale } from "@/lib/i18n/config";
import { formatCurrency } from "@/lib/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "billing")).checkout.metaTitleCredits };
}

export default async function CreditsCheckoutPage({ params }: { params: Promise<{ pack: string }> }) {
  const { pack: packId } = await params;
  const pack = getPack(packId);
  if (!pack) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/checkout/credits/${pack.id}`);
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLIC_KEY;
  if (!key) redirect("/credits?achat=indisponible");
  const locale = await getAccountLocale(supabase, user.id);
  const t = (await getDictionary(locale, "billing")).checkout;
  const price = formatCurrency(locale, pack.priceCents / 100);
  return (
    <CustomCheckout
      publishableKey={key}
      locale={locale}
      t={t}
      product={{
        kind: "credits",
        id: pack.id,
        title: pack.label,
        subtitle: t.creditsPackSubtitle,
        price,
        features: [
          t.creditsFeatureCredits.replace("{credits}", String(pack.credits)),
          t.creditsFeatureUnitPrice.replace("{price}", packUnitPrice(pack, locale)),
          t.creditsFeatureCumulative,
          t.creditsFeatureNoAutoRenew,
        ],
      }}
    />
  );
}
