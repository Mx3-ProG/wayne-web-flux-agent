import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import { offerLimit } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import { OfferTunnel } from "@/components/commerce/offer-tunnel";

export const metadata = { title: "Créer mon offre" };

export default async function ConfigurerOffrePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pageId = await getActivePageId(supabase, user.id);
  if (!pageId) redirect("/ma-page");

  // Limite du forfait + solde : le tunnel affiche le coût (15 cr, 25 cr
  // au-delà de la limite) et le pop-up « recharge tes crédits » si besoin.
  const [{ data: profile }, { count }, { data: balance }] = await Promise.all([
    supabase.from("profiles").select("plan").eq("user_id", user.id).single(),
    supabase
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("page_id", pageId),
    supabase.rpc("credit_balance", { uid: user.id }),
  ]);

  return (
    <OfferTunnel
      userId={user.id}
      offerCount={count ?? 0}
      limit={offerLimit((profile?.plan as Plan) ?? "basique")}
      balance={balance ?? 0}
    />
  );
}
