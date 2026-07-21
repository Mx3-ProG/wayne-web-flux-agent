import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale } from "@/lib/i18n/config";
import { ProductTunnel } from "@/components/commerce/product-tunnel";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "products")).meta.tunnelTitle };
}

export default async function ConfigurerProduitsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pageId = await getActivePageId(supabase, user.id);
  if (!pageId) redirect("/ma-page");

  const { data: balance } = await supabase.rpc("credit_balance", { uid: user.id });

  return <ProductTunnel userId={user.id} balance={balance ?? 0} />;
}
