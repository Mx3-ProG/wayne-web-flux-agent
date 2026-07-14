import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadVitrine } from "@/lib/vitrine-loader";
import { VitrinePublic } from "@/components/vitrine/vitrine-public";
import { GOOGLE_FONTS_URL } from "@/lib/verticals";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadVitrine(slug);
  if (!data) return { title: "Page introuvable" };
  const { page } = data;
  // SEO personnalisé (pages.seo) avec fallback sur les champs de la vitrine.
  const seo = page.seo ?? {};
  const defaultTitle = [page.business_name, page.job_title, page.city]
    .filter(Boolean)
    .join(" · ");
  const title = seo.title?.trim() || defaultTitle || page.slug;
  const description =
    seo.description?.trim() ||
    page.tagline ||
    `${page.business_name} — réservation en ligne${page.city ? ` à ${page.city}` : ""}.`;
  const ogImage = seo.ogImageUrl || page.hero_url;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
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

  const { page, families, productCategories, offers, bookingEnabled } = data;

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
      ...offers.map((o) => ({
        "@type": "Offer",
        name: o.title,
        price: (o.price_cents / 100).toFixed(2),
        priceCurrency: "EUR",
      })),
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
        offers={offers}
        bookingEnabled={bookingEnabled}
      />
    </>
  );
}
