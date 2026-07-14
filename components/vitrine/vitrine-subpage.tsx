"use client";

// Rendu d'une sous-page (/p/slug/a-propos…) : header léger avec retour à
// l'accueil, mini-hero (titre + sous-titre + bannière optionnelle), puis les
// sections de la sous-page — même système de blocs que la home, même socle
// (VitrineShell). Utilisé en SSR public et en préview dans l'éditeur.

import Image from "next/image";
import Link from "next/link";
import type { Offer, Page, Product, Service, SitePage } from "@/lib/types";
import { getFont } from "@/lib/verticals";
import type { PageSection } from "@/lib/sections";
import { Moon, Sun } from "lucide-react";
import { PromoBanner } from "./sections/promo-banner";
import { OffersSection } from "./sections/offers-section";
import { CatalogSection } from "./sections/catalog-section";
import { SectionRenderer, type SectionContext } from "./section-renderer";
import { buildPlan } from "./render-plan";
import { SectionShell } from "./section-shell";
import { VitrineShell } from "./vitrine-shell";
import { VitrineHeader } from "./vitrine-header";
import { isDarkTheme, useVisitorMode } from "./visitor-mode";
import type { CategoryWithProducts, FamilyWithServices } from "./vitrine-view";
import styles from "./vitrine.module.css";

type Props = {
  page: Page;
  sitePage: SitePage;
  families: FamilyWithServices[];
  productCategories?: CategoryWithProducts[];
  offers?: Offer[];
  onBook?: (service: Service) => void;
  onAddToCart?: (product: Product) => void;
  onAddOffer?: (offer: Offer) => void;
  cartCount?: number;
  onOpenCart?: () => void;
  poweredBy?: boolean;
  preview?: boolean;
};

export function VitrineSubpage({
  page,
  sitePage,
  families,
  productCategories = [],
  offers = [],
  onBook,
  onAddToCart,
  onAddOffer,
  cartCount = 0,
  onOpenCart,
  poweredBy = true,
  preview = false,
}: Props) {
  const { effectiveDark, toggleMode } = useVisitorMode(isDarkTheme(page.theme));

  const accent = page.colors.primary || "#d31212";
  const font = getFont(page.font);
  const activeOffers = offers.filter((o) => o.active);

  // Contrairement à la home, pas de complétion des sections natives : une
  // sous-page rend exactement ce qu'elle contient (vide = page vide).
  const sections = ((sitePage.sections ?? []) as PageSection[]).filter(
    (s) => s.enabled
  );
  const plan = buildPlan(sections);
  const firstGroupIndex = plan.findIndex((item) => item.kind === "group");

  const ctx: SectionContext = {
    page,
    families,
    productCategories,
    activeOffers,
    accent,
    fontCss: font.css,
    preview,
    onBook,
    onAddToCart,
  };

  const homeHref = `/p/${page.slug}`;

  return (
    <VitrineShell
      page={page}
      poweredBy={poweredBy}
      cartCount={cartCount}
      onOpenCart={onOpenCart}
    >
      {/* Mini-hero : header + titre de la sous-page */}
      <header
        className={`${styles.hero} ${styles.subpageHero} ${
          sitePage.hero_url ? styles.heroWithImage : ""
        }`}
      >
        {sitePage.hero_url && (
          <>
            <Image
              src={sitePage.hero_url}
              alt=""
              fill
              className={styles.heroImage}
              sizes="100vw"
              priority
            />
            <div className={styles.heroOverlay} />
          </>
        )}
        {page.navigation ? (
          <VitrineHeader
            page={page}
            currentPath={sitePage.path}
            preview={preview}
          />
        ) : (
        <div className={styles.storeNav}>
          {preview ? (
            <span className={styles.storeNavName}>
              {page.logo_url ? (
                <Image src={page.logo_url} alt="" width={34} height={34} />
              ) : (
                <i>{(page.business_name || "M").charAt(0).toUpperCase()}</i>
              )}
              <b>{page.business_name || "Mon commerce"}</b>
            </span>
          ) : (
            <Link className={styles.storeNavName} href={homeHref}>
              {page.logo_url ? (
                <Image src={page.logo_url} alt="" width={34} height={34} />
              ) : (
                <i>{(page.business_name || "M").charAt(0).toUpperCase()}</i>
              )}
              <b>{page.business_name || "Mon commerce"}</b>
            </Link>
          )}
          <span className={styles.storeNavActions}>
            <button
              type="button"
              className={styles.modeToggle}
              onClick={toggleMode}
              aria-label={effectiveDark ? "Passer en mode clair" : "Passer en mode sombre"}
            >
              {effectiveDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </button>
            {!preview && <Link href={homeHref}>Accueil</Link>}
          </span>
        </div>
        )}
        <div className={styles.heroInner}>
          <h1>{sitePage.title || page.business_name}</h1>
          {sitePage.subtitle && (
            <p className={styles.tagline}>{sitePage.subtitle}</p>
          )}
        </div>
      </header>

      {plan.map((item, planIndex) => {
        if (item.kind === "promo") {
          return <PromoBanner key="promo" page={page} accent={accent} />;
        }
        if (item.kind === "offres") {
          const settings = item.section.settings as
            | { title?: string; subtitle?: string }
            | undefined;
          return (
            <OffersSection
              key="offres"
              offers={activeOffers}
              accent={accent}
              onAddOffer={onAddOffer}
              title={settings?.title}
              subtitle={settings?.subtitle}
            />
          );
        }
        if (item.kind === "styled") {
          return (
            <SectionShell
              key={item.section.id}
              id={`s-${item.section.id}`}
              style={item.section.style}
            >
              <SectionRenderer section={item.section} first ctx={ctx} />
            </SectionShell>
          );
        }
        return (
          <section
            key={`group-${planIndex}`}
            className={styles.services}
            id={planIndex === firstGroupIndex ? "prestations" : undefined}
          >
            {item.items.map((entry, entryIndex) =>
              entry.kind === "catalogue" ? (
                <CatalogSection
                  key={entry.key}
                  mode="combined"
                  families={families}
                  productCategories={productCategories}
                  accent={accent}
                  onBook={onBook}
                  onAddToCart={onAddToCart}
                  showEmpty
                  first={entryIndex === 0}
                />
              ) : (
                // Ancre stable pour le menu de navigation (#s-<sectionId>).
                <div key={entry.key} id={`s-${entry.section.id}`}>
                  <SectionRenderer
                    section={entry.section}
                    first={entryIndex === 0}
                    ctx={ctx}
                  />
                </div>
              )
            )}
          </section>
        );
      })}
      {sections.length === 0 && (
        <section className={styles.services}>
          <p className={styles.address}>Cette page est en cours de rédaction.</p>
        </section>
      )}
    </VitrineShell>
  );
}
