import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  Offer,
  Product,
  ProductCategory,
  Service,
  ServiceFamily,
} from "@/lib/types";
import { getVertical } from "@/lib/verticals";
import { getActivePage } from "@/lib/active-project";
import type { CategoryWithProducts } from "@/components/vitrine/vitrine-view";
import { CreatePageWizard } from "@/components/editor/create-page-wizard";
import { PageEditor } from "@/components/editor/page-editor";
import { VitrineGuide } from "@/components/editor/vitrine-guide";

export const metadata = { title: "Ma vitrine" };

export default async function MaPagePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const page = await getActivePage(supabase, user.id);

  if (!page) return <CreatePageWizard />;

  const params = await searchParams;
  if (params.view !== "editor") return <VitrineGuide initialPage={page} />;

  const [
    { data: families },
    { data: services },
    { data: productCategories },
    { data: products },
    { data: offers },
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
    supabase.from("offers").select("*").eq("page_id", page.id).order("position"),
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

  // Produits et offres : lecture seule pour l'aperçu (édition sur /produits et
  // /offres).
  const allProducts = (products ?? []) as Product[];
  const previewProducts: CategoryWithProducts[] = (
    (productCategories ?? []) as ProductCategory[]
  ).map((c) => ({
    ...c,
    products: allProducts.filter((p) => p.category_id === c.id),
  }));

  return (
    <PageEditor
      initialPage={page}
      initialCatalog={catalog}
      previewProducts={previewProducts}
      previewOffers={(offers ?? []) as Offer[]}
      verticalKind={getVertical(page.vertical).kind}
    />
  );
}
