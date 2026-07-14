import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomCheckout } from "@/components/checkout/custom-checkout";
import { getPack, packUnitPrice } from "@/lib/credit-packs";

export const metadata = { title: "Acheter des crédits" };

export default async function CreditsCheckoutPage({ params }: { params: Promise<{ pack: string }> }) {
  const { pack: packId } = await params;
  const pack = getPack(packId);
  if (!pack) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/checkout/credits/${pack.id}`);
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLIC_KEY;
  if (!key) redirect("/credits?achat=indisponible");
  return <CustomCheckout publishableKey={key} product={{
    kind: "credits", id: pack.id, title: pack.label, subtitle: "Une recharge ponctuelle, sans abonnement supplémentaire et ajoutée automatiquement à ton solde.",
    price: `${(pack.priceCents / 100).toLocaleString("fr-FR")} €`,
    features: [`${pack.credits} crédits FLUX`, `${packUnitPrice(pack)} € par crédit`, "Crédits cumulables", "Aucun renouvellement automatique"],
  }} />;
}
