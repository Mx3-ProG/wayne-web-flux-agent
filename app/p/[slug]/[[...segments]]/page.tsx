import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { loadVitrine } from "@/lib/vitrine-loader";
import { VitrinePublic } from "@/components/vitrine/vitrine-public";
import { GOOGLE_FONTS_URL } from "@/lib/verticals";
import { LOCALE_BCP47, LOCALE_OG, locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

// Route catch-all unique pour toutes les URLs de sous-pages ET de langue :
// /p/{slug}, /p/{slug}/{pagePath}, /p/{slug}/{locale}, /p/{slug}/{locale}/{pagePath}.
//
// Next.js App Router interdit deux segments dynamiques de noms différents à
// la même position ("[pagePath]" et "[locale]" ne peuvent pas coexister
// comme dossiers frères — voir node_modules/next/dist/docs, section
// dynamic-routes) : une route catch-all avec résolution manuelle est la
// seule structure non ambiguë. Les 9 codes de langue sont réservés (voir
// app/(app)/ma-page/subpage-actions.ts#RESERVED_PATHS) : un premier segment
// qui matche un code de langue est TOUJOURS interprété comme une langue,
// jamais comme un chemin de sous-page.
export const revalidate = 60;

const RESERVED = new Set<string>(locales);

type Params = Promise<{ slug: string; segments?: string[] }>;

function resolveSegments(segments: string[] | undefined): {
  locale: string | undefined;
  pagePath: string | undefined;
} {
  const parts = segments ?? [];
  if (parts.length === 0) return { locale: undefined, pagePath: undefined };
  if (RESERVED.has(parts[0])) {
    if (parts.length > 2) return { locale: parts[0], pagePath: "__invalid__" };
    return { locale: parts[0], pagePath: parts[1] };
  }
  if (parts.length > 1) return { locale: undefined, pagePath: "__invalid__" };
  return { locale: undefined, pagePath: parts[0] };
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug, segments } = await params;
  const { locale, pagePath } = resolveSegments(segments);
  if (pagePath === "__invalid__") return { title: "Page introuvable" };
  const data = await loadVitrine(slug, locale);
  if (!data) return { title: "Page introuvable" };
  const { page } = data;
  const sitePage = pagePath ? data.sitePages.find((sp) => sp.path === pagePath) : undefined;
  if (pagePath && !sitePage) return { title: "Page introuvable" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const localePrefix = data.locale === page.default_locale ? "" : `/${data.locale}`;
  const canonicalPath = [localePrefix, sitePage ? `/${sitePage.path}` : ""].join("");

  const seo = (sitePage?.seo ?? page.seo) ?? {};
  const defaultTitle = sitePage
    ? [sitePage.title, page.business_name].filter(Boolean).join(" · ")
    : [page.business_name, page.job_title, page.city].filter(Boolean).join(" · ");
  const title = seo.title?.trim() || defaultTitle || page.slug;
  const description =
    seo.description?.trim() ||
    sitePage?.subtitle ||
    page.tagline ||
    `${page.business_name}${page.city ? ` à ${page.city}` : ""}.`;
  const ogImage = seo.ogImageUrl || sitePage?.hero_url || page.hero_url;

  // hreflang uniquement vers les langues avec une traduction publiée
  // complète — jamais vers une langue absente ou en erreur (brief Lot 10).
  const languages: Record<string, string> = {};
  for (const l of data.availableLocales) {
    const prefix = l === page.default_locale ? "" : `/${l}`;
    languages[LOCALE_BCP47[l]] = `${siteUrl}/p/${page.slug}${prefix}${sitePage ? `/${sitePage.path}` : ""}`;
  }
  languages["x-default"] = `${siteUrl}/p/${page.slug}${sitePage ? `/${sitePage.path}` : ""}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/p/${page.slug}${canonicalPath}`,
      languages,
    },
    openGraph: {
      title,
      description,
      locale: LOCALE_OG[data.locale],
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function VitrineRoute({ params }: { params: Params }) {
  const { slug, segments } = await params;
  const { locale, pagePath } = resolveSegments(segments);
  if (pagePath === "__invalid__") notFound();

  const data = await loadVitrine(slug, locale);
  if (!data) notFound();

  // Langue demandée absente/non publiée : repli propre sur la langue
  // principale plutôt qu'un 404 — on redirige vers l'équivalent dans la
  // langue réellement servie (jamais de mélange de langues sur une même
  // page rendue).
  if (locale && data.locale !== locale) {
    const prefix = data.locale === data.page.default_locale ? "" : `/${data.locale}`;
    redirect(`/p/${slug}${prefix}${pagePath ? `/${pagePath}` : ""}`);
  }

  const sitePage = pagePath ? data.sitePages.find((sp) => sp.path === pagePath) : undefined;
  if (pagePath && !sitePage) notFound();

  const { page, families, productCategories, offers, bookingEnabled } = data;
  const t = await getDictionary(data.locale, "storefront");

  if (sitePage) {
    return (
      <>
        <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
        <VitrinePublic
          page={page}
          sitePage={sitePage}
          families={families}
          productCategories={productCategories}
          offers={offers}
          bookingEnabled={bookingEnabled}
          locale={data.locale}
          availableLocales={data.availableLocales}
          t={t}
        />
      </>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    inLanguage: LOCALE_BCP47[data.locale],
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
        locale={data.locale}
        availableLocales={data.availableLocales}
        t={t}
      />
    </>
  );
}
