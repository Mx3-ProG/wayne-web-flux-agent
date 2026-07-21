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
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n/config";
import { applyTranslation, loadPublishedTranslations, translationFor } from "@/lib/localized-content";

export type VitrineData = {
  page: Page;
  families: FamilyWithServices[];
  productCategories: CategoryWithProducts[];
  offers: Offer[];
  sitePages: SitePage[];
  bookingEnabled: boolean;
  // Langue effectivement servie (peut différer de `requestedLocale` quand
  // celle-ci n'a pas de traduction publiée complète : repli propre sur la
  // langue principale plutôt que mélanger les langues).
  locale: Locale;
  requestedLocale: Locale;
  // Langue principale + langues dont la traduction de page est publiée.
  availableLocales: Locale[];
};

// `locale` = langue demandée par l'URL (segment /p/{slug}/{locale}/...).
// Absent ou invalide → langue principale du projet, sans traduction à
// fusionner (comportement historique de /p/{slug}).
export async function loadVitrine(
  slug: string,
  locale?: string
): Promise<VitrineData | null> {
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

  const defaultProjectLocale = hasLocale(page.default_locale) ? page.default_locale : defaultLocale;
  const requestedLocale = locale && hasLocale(locale) ? locale : defaultProjectLocale;

  // Langues avec une traduction de page publiée (source de vérité pour le
  // globe, le hreflang et la résolution de langue ci-dessous : jamais une
  // langue "activée" mais dont la traduction n'est pas encore prête).
  const { data: publishedPageLocales } = await supabase
    .from("localized_content")
    .select("locale")
    .eq("page_id", page.id)
    .eq("entity_type", "page")
    .eq("entity_id", page.id)
    .not("published_fields", "is", null);
  const availableLocales: Locale[] = Array.from(
    new Set([
      defaultProjectLocale,
      ...((publishedPageLocales ?? []) as { locale: string }[])
        .map((r) => r.locale)
        .filter(hasLocale),
    ])
  );

  // Repli propre sur la langue principale si la langue demandée n'a pas
  // (ou plus) de traduction publiée complète : on ne mélange jamais deux
  // langues dans une même page rendue.
  const resolvedLocale: Locale = availableLocales.includes(requestedLocale)
    ? requestedLocale
    : defaultProjectLocale;

  let mergedPage = page;
  let mergedSitePages = sitePages;
  let mergedFamilies = families;
  let mergedProductCategories = productCategories;
  let mergedOffers = offers;

  if (resolvedLocale !== defaultProjectLocale) {
    const translations = await loadPublishedTranslations(supabase, page.id, resolvedLocale);
    mergedPage = applyTranslation(page, translationFor(translations, "page", page.id), [
      "tagline",
      "seo",
      "navigation",
      "sections",
      "legal",
      "reviews",
    ]);
    mergedSitePages = sitePages.map((sp) =>
      applyTranslation(sp, translationFor(translations, "site_page", sp.id), [
        "title",
        "subtitle",
        "seo",
        "sections",
      ])
    );
    mergedFamilies = families.map((f) => ({
      ...applyTranslation(f, translationFor(translations, "service_family", f.id), ["name"]),
      services: f.services.map((s) =>
        applyTranslation(s, translationFor(translations, "service", s.id), ["name"])
      ),
    }));
    mergedProductCategories = productCategories.map((c) => ({
      ...applyTranslation(c, translationFor(translations, "product_category", c.id), ["name"]),
      products: c.products.map((p) =>
        applyTranslation(p, translationFor(translations, "product", p.id), ["name", "description"])
      ),
    }));
    mergedOffers = offers.map((o) =>
      applyTranslation(o, translationFor(translations, "offer", o.id), ["title", "description"])
    );
  }

  return {
    page: mergedPage,
    families: mergedFamilies,
    productCategories: mergedProductCategories,
    offers: mergedOffers,
    sitePages: mergedSitePages,
    bookingEnabled,
    locale: resolvedLocale,
    requestedLocale,
    availableLocales,
  };
}
