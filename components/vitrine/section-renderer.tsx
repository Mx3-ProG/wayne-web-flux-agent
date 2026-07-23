"use client";

import type { Offer, Page, Product, Service } from "@/lib/types";
import type { PageSection } from "@/lib/sections";
import type { CategoryWithProducts, FamilyWithServices } from "./vitrine-view";
import { CatalogSection } from "./sections/catalog-section";
import { GallerySection } from "./sections/gallery-section";
import { ReviewsSection } from "./sections/reviews-section";
import { HoursSection } from "./sections/hours-section";
import { TextSection } from "./sections/text-section";
import { ImageTextSection } from "./sections/image-text-section";
import { FaqSection } from "./sections/faq-section";
import { AboutSection } from "./sections/about-section";
import { BeforeAfterSection } from "./sections/before-after-section";
import { MapSection } from "./sections/map-section";
import { GoogleBusinessSection } from "./sections/google-business-section";
import { NewsletterSection } from "./sections/newsletter-section";
import { VideoSection } from "./sections/video-section";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";

export type SectionContext = {
  page: Page;
  families: FamilyWithServices[];
  productCategories: CategoryWithProducts[];
  activeOffers: Offer[];
  accent: string;
  fontCss: string;
  preview: boolean;
  onBook?: (service: Service) => void;
  onAddToCart?: (product: Product) => void;
  t?: StorefrontDict["sections"];
};

// Rendu d'une section « interne » (à l'intérieur d'un wrapper .services).
// Les sections pleine largeur (promo, offres) et le duo boutique+prestations
// adjacent sont gérés directement par vitrine-view.
export function SectionRenderer({
  section,
  first,
  ctx,
}: {
  section: PageSection;
  first: boolean;
  ctx: SectionContext;
}) {
  const { page } = ctx;
  const native = section.type in NATIVE_TITLES ? (section.settings as { title?: string; subtitle?: string } | undefined) : undefined;

  switch (section.type) {
    case "boutique":
      return (
        <CatalogSection
          mode="boutique"
          families={ctx.families}
          productCategories={ctx.productCategories}
          accent={ctx.accent}
          onAddToCart={ctx.onAddToCart}
          first={first}
          title={native?.title}
          subtitle={native?.subtitle}
          t={ctx.t?.catalog}
        />
      );
    case "prestations":
      return (
        <CatalogSection
          mode="prestations"
          families={ctx.families}
          productCategories={ctx.productCategories}
          accent={ctx.accent}
          onBook={ctx.onBook}
          first={first}
          title={native?.title}
          subtitle={native?.subtitle}
          t={ctx.t?.catalog}
        />
      );
    case "galerie":
      return (
        <GallerySection
          gallery={page.gallery}
          first={first}
          title={native?.title}
          subtitle={native?.subtitle}
          t={ctx.t?.gallery}
        />
      );
    case "avis":
      return (
        <ReviewsSection
          reviews={page.reviews}
          first={first}
          title={native?.title}
          subtitle={native?.subtitle}
          t={ctx.t?.reviews}
        />
      );
    case "horaires":
      return (
        <HoursSection
          hoursText={page.hours_text}
          fontCss={ctx.fontCss}
          first={first}
          title={native?.title}
          subtitle={native?.subtitle}
          t={ctx.t?.hours}
        />
      );
    case "texte":
      return <TextSection {...section.settings} first={first} />;
    case "image_texte":
      return <ImageTextSection {...section.settings} first={first} />;
    case "faq":
      return (
        <FaqSection
          items={section.settings.items}
          title={section.settings.title}
          first={first}
          t={ctx.t?.faq}
        />
      );
    case "a_propos":
      return <AboutSection {...section.settings} first={first} t={ctx.t?.about} />;
    case "avant_apres":
      return <BeforeAfterSection {...section.settings} first={first} t={ctx.t?.beforeAfter} />;
    case "carte":
      return (
        <MapSection
          fallbackQuery={
            page.address
              ? [page.address, page.city].filter(Boolean).join(", ")
              : ""
          }
          first={first}
          t={ctx.t?.map}
        />
      );
    case "google_business":
      return <GoogleBusinessSection {...section.settings} first={first} t={ctx.t?.googleBusiness} />;
    case "newsletter":
      return (
        <NewsletterSection
          slug={page.slug}
          title={section.settings.title}
          description={section.settings.description}
          interactive={!ctx.preview}
          first={first}
          t={ctx.t?.newsletter}
        />
      );
    case "video":
      return <VideoSection url={section.settings.url} first={first} t={ctx.t?.video} />;
    default:
      return null;
  }
}

const NATIVE_TITLES: Record<string, true> = {
  boutique: true,
  prestations: true,
  galerie: true,
  avis: true,
  horaires: true,
};
