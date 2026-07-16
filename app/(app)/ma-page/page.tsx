import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  Offer,
  Page,
  Plan,
  Product,
  ProductCategory,
  Service,
  ServiceFamily,
  SitePage,
} from "@/lib/types";
import { getVertical } from "@/lib/verticals";
import { getActivePage } from "@/lib/active-project";
import { subpageLimit } from "@/lib/plans";
import { checkFluxAccess } from "@/lib/flux/access";
import type { CategoryWithProducts } from "@/components/vitrine/vitrine-view";
import { CreatePageWizard } from "@/components/editor/create-page-wizard";
import { PageEditor } from "@/components/editor/page-editor";
import { SubpageEditor } from "@/components/editor/subpage-editor";
import { VitrineGuide } from "@/components/editor/vitrine-guide";

export const metadata = { title: "Ma vitrine" };

export default async function MaPagePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[]; p?: string | string[] }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rawPage = await getActivePage(supabase, user.id);

  if (!rawPage) return <CreatePageWizard />;

  // L'éditeur travaille sur le brouillon : état publié + modifications en
  // attente (pages.draft). La vitrine publique, elle, ne lit que les colonnes.
  const page: Page = { ...rawPage, ...(rawPage.draft ?? {}) };

  const [
    { data: balance },
    { data: lastVersion },
    { count: pendingOffers },
    { data: rawSitePages },
    { data: profile },
    { data: canHideBranding },
  ] = await Promise.all([
    supabase.rpc("credit_balance", { uid: user.id }),
    supabase
      .from("page_versions")
      .select("version")
      .eq("page_id", page.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle<{ version: number }>(),
    supabase
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("page_id", page.id)
      .or("draft.not.is.null,draft_status.not.is.null"),
    supabase
      .from("site_pages")
      .select("*")
      .eq("page_id", page.id)
      .order("position"),
    supabase.from("profiles").select("plan").eq("user_id", user.id).single(),
    supabase.rpc("can_hide_branding"),
  ]);
  const sitePages = (rawSitePages ?? []) as SitePage[];
  const pendingSitePages = sitePages.some(
    (sp) => sp.draft != null || sp.draft_status != null
  );
  const hasDraft =
    rawPage.draft != null || (pendingOffers ?? 0) > 0 || pendingSitePages;
  const maxSubpages = subpageLimit((profile?.plan as Plan) ?? "basique");
  const publishProps = {
    pageId: page.id,
    balance: balance ?? 0,
    hasDraft,
    nextVersion: (lastVersion?.version ?? 0) + 1,
  };

  const params = await searchParams;
  if (params.view !== "editor") {
    // Annonce le verrou de la génération complète avant le clic. L'autorité
    // reste checkFluxAccess dans fluxGenerateSite ; ceci n'est que l'affichage.
    const siteAccess = await checkFluxAccess(user.id, "site");
    return (
      <VitrineGuide
        initialPage={page}
        publish={publishProps}
        canGenerateSite={siteAccess.ok}
      />
    );
  }

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

  // L'aperçu montre l'état futur : brouillons d'offres appliqués, suppressions
  // différées exclues.
  const previewOffers = ((offers ?? []) as Offer[])
    .filter((o) => o.draft_status !== "deleted")
    .map((o) => ({ ...o, ...(o.draft ?? {}) }));

  // ?p=<sitePageId> : édition d'une sous-page plutôt que de l'accueil.
  const requestedSitePageId = Array.isArray(params.p) ? params.p[0] : params.p;
  const activeSitePage = requestedSitePageId
    ? sitePages.find((sp) => sp.id === requestedSitePageId)
    : undefined;

  if (activeSitePage) {
    // Preview des sections natives d'une sous-page : mêmes données que la home.
    const previewFamilies = ((families ?? []) as ServiceFamily[]).map((f) => ({
      ...f,
      services: ((services ?? []) as Service[]).filter(
        (s) => s.family_id === f.id
      ),
    }));
    return (
      <SubpageEditor
        page={page}
        sitePage={activeSitePage}
        sitePages={sitePages}
        subpageLimit={maxSubpages}
        previewFamilies={previewFamilies}
        previewProducts={previewProducts}
        previewOffers={previewOffers}
        publish={publishProps}
      />
    );
  }

  return (
    <PageEditor
      initialPage={page}
      initialCatalog={catalog}
      previewProducts={previewProducts}
      previewOffers={previewOffers}
      verticalKind={getVertical(page.vertical).kind}
      publish={publishProps}
      sitePages={sitePages}
      subpageLimit={maxSubpages}
      canHideBranding={canHideBranding === true}
    />
  );
}
