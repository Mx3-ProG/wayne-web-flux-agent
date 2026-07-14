// Chargement SSR de la vitrine publique (home + sous-pages) : page publiée,
// catalogue, horaires, offres et sous-pages publiées. Partagé entre
// /p/[slug] et /p/[slug]/[pagePath].

import { createPublicClient } from "@/lib/supabase/public";
import type {
  Offer,
  Page,
  Product,
  ProductCategory,
  Schedule,
  Service,
  ServiceFamily,
  SitePage,
} from "@/lib/types";
import type {
  CategoryWithProducts,
  FamilyWithServices,
} from "@/components/vitrine/vitrine-view";

export type VitrineData = {
  page: Page;
  families: FamilyWithServices[];
  productCategories: CategoryWithProducts[];
  offers: Offer[];
  sitePages: SitePage[];
  bookingEnabled: boolean;
};

export async function loadVitrine(slug: string): Promise<VitrineData | null> {
  const supabase = createPublicClient();
  const { data: page, error: pageError } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle<Page>();
  if (pageError) {
    console.error("Unable to load public page", {
      slug,
      code: pageError.code,
      message: pageError.message,
    });
    throw new Error(`Unable to load public page (${pageError.code})`);
  }
  if (!page) return null;

  const [
    familiesResult,
    servicesResult,
    schedulesResult,
    productCategoriesResult,
    productsResult,
    offersResult,
    sitePagesResult,
  ] = await Promise.all([
    supabase
      .from("service_families")
      .select("*")
      .eq("page_id", page.id)
      .order("position"),
    supabase
      .from("services")
      .select("*")
      .eq("page_id", page.id)
      .order("position"),
    supabase.from("schedules").select("*").eq("page_id", page.id),
    supabase
      .from("product_categories")
      .select("*")
      .eq("page_id", page.id)
      .order("position"),
    supabase
      .from("products")
      .select("*")
      .eq("page_id", page.id)
      .eq("active", true)
      .order("position"),
    supabase
      .from("offers")
      .select("*")
      .eq("page_id", page.id)
      .eq("active", true)
      // Une offre jamais publiée (brouillon `new`) n'apparaît pas en public ;
      // une offre en suppression différée reste visible jusqu'à publication.
      .or("draft_status.is.null,draft_status.eq.deleted")
      .order("position"),
    // Sous-pages publiées (la policy publique filtre déjà draft_status = 'new').
    supabase
      .from("site_pages")
      .select("*")
      .eq("page_id", page.id)
      .eq("published", true)
      .order("position"),
  ]);

  const relatedError =
    familiesResult.error ||
    servicesResult.error ||
    schedulesResult.error ||
    productCategoriesResult.error ||
    productsResult.error ||
    offersResult.error;
  // Non-fatal : la home doit rester servie même si la table site_pages n'est
  // pas encore migrée (déploiement code avant migration 00021).
  if (sitePagesResult.error) {
    console.error("Unable to load site pages", {
      slug,
      code: sitePagesResult.error.code,
      message: sitePagesResult.error.message,
    });
  }
  if (relatedError) {
    console.error("Unable to load public page content", {
      slug,
      code: relatedError.code,
      message: relatedError.message,
    });
    throw new Error(`Unable to load public page content (${relatedError.code})`);
  }

  const services = (servicesResult.data ?? []) as Service[];
  const families: FamilyWithServices[] = (
    (familiesResult.data ?? []) as ServiceFamily[]
  ).map((family) => ({
    ...family,
    services: services.filter((service) => service.family_id === family.id),
  }));
  const bookingEnabled = ((schedulesResult.data ?? []) as Schedule[]).some(
    (schedule) => schedule.open
  );

  const products = (productsResult.data ?? []) as Product[];
  const productCategories: CategoryWithProducts[] = (
    (productCategoriesResult.data ?? []) as ProductCategory[]
  ).map((category) => ({
    ...category,
    products: products.filter(
      (product) => product.category_id === category.id && product.kind !== "reservation"
    ),
  }));

  const offers = (offersResult.data ?? []) as Offer[];
  const sitePages = (sitePagesResult.data ?? []) as SitePage[];

  return { page, families, productCategories, offers, sitePages, bookingEnabled };
}
