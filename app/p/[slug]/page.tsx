import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Page, Schedule, Service, ServiceFamily } from "@/lib/types";
import type { FamilyWithServices } from "@/components/vitrine/vitrine-view";
import { VitrinePublic } from "@/components/vitrine/vitrine-public";
import { GOOGLE_FONTS_URL } from "@/lib/verticals";

export const revalidate = 60;

async function loadVitrine(slug: string) {
  const supabase = createAdminClient();
  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single<Page>();
  if (!page) return null;

  const [{ data: familiesData }, { data: servicesData }, { data: schedules }] =
    await Promise.all([
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
    ]);

  const services = (servicesData ?? []) as Service[];
  const families: FamilyWithServices[] = ((familiesData ?? []) as ServiceFamily[]).map(
    (f) => ({ ...f, services: services.filter((s) => s.family_id === f.id) })
  );
  const bookingEnabled = ((schedules ?? []) as Schedule[]).some((s) => s.open);

  return { page, families, bookingEnabled };
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

  const { page, families, bookingEnabled } = data;

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
    makesOffer: families.flatMap((f) =>
      f.services.map((s) => ({
        "@type": "Offer",
        name: s.name,
        price: (s.price_cents / 100).toFixed(2),
        priceCurrency: "EUR",
      }))
    ),
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
        bookingEnabled={bookingEnabled}
      />
    </>
  );
}
