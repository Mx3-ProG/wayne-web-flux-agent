import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import { ProductTunnel } from "@/components/commerce/product-tunnel";

export const metadata = { title: "Créer mes produits" };

export default async function ConfigurerProduitsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pageId = await getActivePageId(supabase, user.id);
  if (!pageId) redirect("/ma-page");

  const { data: balance } = await supabase.rpc("credit_balance", { uid: user.id });

  return <ProductTunnel userId={user.id} balance={balance ?? 0} />;
}
