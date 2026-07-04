import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import { OfferTunnel } from "@/components/commerce/offer-tunnel";

export const metadata = { title: "Créer mon offre" };

export default async function ConfigurerOffrePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pageId = await getActivePageId(supabase, user.id);
  if (!pageId) redirect("/ma-page");

  return <OfferTunnel userId={user.id} />;
}
