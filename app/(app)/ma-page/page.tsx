import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  Page,
  Product,
  ProductCategory,
  Service,
  ServiceFamily,
} from "@/lib/types";
import { getVertical } from "@/lib/verticals";
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

  const [
    { data: families },
    { data: services },
    { data: productCategories },
    { data: products },
  ] = await Promise.all([
    supabase
      .from("service_families")
      .select("*")
      .eq("page_id", page.id)
      .order("position"),
    supabase.from("services").select("*").eq("page_id", page.id).order("position"),
    supabase
      .from("product_categories")
      .select("*")
      .eq("page_id", page.id)
      .order("position"),
    supabase.from("products").select("*").eq("page_id", page.id).order("position"),
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

  const shop = ((productCategories ?? []) as ProductCategory[]).map((c) => ({
    id: c.id,
    name: c.name,
    products: ((products ?? []) as Product[])
      .filter((p) => p.category_id === c.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price_cents: p.price_cents,
        image_url: p.image_url,
      })),
  }));

  return (
    <PageEditor
      initialPage={page}
      initialCatalog={catalog}
      initialShop={shop}
      verticalKind={getVertical(page.vertical).kind}
    />
  );
}
