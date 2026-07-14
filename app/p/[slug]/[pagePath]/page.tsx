import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadVitrine } from "@/lib/vitrine-loader";
import { VitrinePublic } from "@/components/vitrine/vitrine-public";
import { GOOGLE_FONTS_URL } from "@/lib/verticals";

export const revalidate = 60;

type Params = Promise<{ slug: string; pagePath: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug, pagePath } = await params;
  const data = await loadVitrine(slug);
  const sitePage = data?.sitePages.find((sp) => sp.path === pagePath);
  if (!data || !sitePage) return { title: "Page introuvable" };
  const { page } = data;
  const seo = sitePage.seo ?? {};
  const defaultTitle = [sitePage.title, page.business_name]
    .filter(Boolean)
    .join(" · ");
  const title = seo.title?.trim() || defaultTitle || page.slug;
  const description =
    seo.description?.trim() ||
    sitePage.subtitle ||
    page.tagline ||
    `${page.business_name}${page.city ? ` à ${page.city}` : ""}.`;
  const ogImage = seo.ogImageUrl || sitePage.hero_url || page.hero_url;
  return {
    title,
    description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/p/${page.slug}/${sitePage.path}`,
    },
    openGraph: {
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function VitrineSubpageRoute({
  params,
}: {
  params: Params;
}) {
  const { slug, pagePath } = await params;
  const data = await loadVitrine(slug);
  if (!data) notFound();
  const sitePage = data.sitePages.find((sp) => sp.path === pagePath);
  if (!sitePage) notFound();

  const { page, families, productCategories, offers, bookingEnabled } = data;

  return (
    <>
      {/* Police choisie par le commerçant */}
      <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      <VitrinePublic
        page={page}
        sitePage={sitePage}
        families={families}
        productCategories={productCategories}
        offers={offers}
        bookingEnabled={bookingEnabled}
      />
    </>
  );
}
