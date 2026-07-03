import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Page, Service, ServiceFamily } from "@/lib/types";
import { CreatePageWizard } from "@/components/editor/create-page-wizard";
import { PageEditor } from "@/components/editor/page-editor";

export const metadata = { title: "Ma vitrine" };

export default async function MaPagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<Page>();

  if (!page) return <CreatePageWizard />;

  const [{ data: families }, { data: services }] = await Promise.all([
    supabase
      .from("service_families")
      .select("*")
      .eq("page_id", page.id)
      .order("position"),
    supabase.from("services").select("*").eq("page_id", page.id).order("position"),
  ]);

  const catalog = ((families ?? []) as ServiceFamily[]).map((f) => ({
    name: f.name,
    services: ((services ?? []) as Service[])
      .filter((s) => s.family_id === f.id)
      .map((s) => ({
        name: s.name,
        duration_min: s.duration_min,
        price_cents: s.price_cents,
      })),
  }));

  return <PageEditor initialPage={page} initialCatalog={catalog} />;
}
