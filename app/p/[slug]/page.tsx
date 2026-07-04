import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  Page,
  Product,
  ProductCategory,
  Schedule,
  Service,
  ServiceFamily,
} from "@/lib/types";
import type {
  CategoryWithProducts,
  FamilyWithServices,
} from "@/components/vitrine/vitrine-view";
import { VitrinePublic } from "@/components/vitrine/vitrine-public";
import { GOOGLE_FONTS_URL } from "@/lib/verticals";

export const revalidate = 60;

async function loadVitrine(slug: string) {
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
    ]);

  const relatedError =
    familiesResult.error ||
    servicesResult.error ||
    schedulesResult.error ||
    productCategoriesResult.error ||
    productsResult.error;
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
  const bookingEnabled = (
    (schedulesResult.data ?? []) as Schedule[]
  ).some((schedule) => schedule.open);

  const products = (productsResult.data ?? []) as Product[];
  const productCategories: CategoryWithProducts[] = (
    (productCategoriesResult.data ?? []) as ProductCategory[]
  ).map((category) => ({
    ...category,
    products: products.filter((product) => product.category_id === category.id),
  }));

  return { page, families, productCategories, bookingEnabled };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadVitrine(slug);
  if (!data) return { title: "Page introuvable" };
  const { page } = data;
  const title = [page.business_name, page.job_title, page.city]
    .filter(Boolean)
    .join(" · ");
  return {
    title: title || page.slug,
    description:
      page.tagline ||
      `${page.business_name} — réservation en ligne${page.city ? ` à ${page.city}` : ""}.`,
    openGraph: {
      title,
      description: page.tagline,
      images: page.hero_url ? [page.hero_url] : undefined,
    },
  };
}

export default async function VitrinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadVitrine(slug);
  if (!data) notFound();

  const { page, families, productCategories, bookingEnabled } = data;

  // SEO local : données structurées LocalBusiness
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: page.business_name,
    description: page.tagline,
    telephone: page.phone || undefined,
    address: page.address
      ? {
          "@type": "PostalAddress",
          streetAddress: page.address,
          addressLocality: page.city,
          addressCountry: "FR",
        }
      : undefined,
    image: page.hero_url || page.logo_url || undefined,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/p/${page.slug}`,
    makesOffer: [
      ...families.flatMap((f) =>
        f.services.map((s) => ({
          "@type": "Offer",
          name: s.name,
          price: (s.price_cents / 100).toFixed(2),
          priceCurrency: "EUR",
        }))
      ),
      ...productCategories.flatMap((c) =>
        c.products.map((p) => ({
          "@type": "Offer",
          name: p.name,
          price: (p.price_cents / 100).toFixed(2),
          priceCurrency: "EUR",
        }))
      ),
    ],
  };

  return (
    <>
      {/* Police choisie par le commerçant */}
      <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <VitrinePublic
        page={page}
        families={families}
        productCategories={productCategories}
        bookingEnabled={bookingEnabled}
      />
    </>
  );
}
