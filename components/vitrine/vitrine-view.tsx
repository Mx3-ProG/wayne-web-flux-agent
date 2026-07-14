"use client";

import Image from "next/image";
import type { Offer, Page, Product, ProductCategory, Service, ServiceFamily } from "@/lib/types";
import { getFont } from "@/lib/verticals";
import { resolveSections } from "@/lib/sections";
import { ArrowRight, MapPin, Moon, Sun } from "lucide-react";
import { PromoBanner } from "./sections/promo-banner";
import { OffersSection } from "./sections/offers-section";
import { CatalogSection } from "./sections/catalog-section";
import { SectionRenderer, type SectionContext } from "./section-renderer";
import { buildPlan } from "./render-plan";
import { SectionShell } from "./section-shell";
import { VitrineShell } from "./vitrine-shell";
import { VitrineHeader } from "./vitrine-header";
import { isDarkTheme, useVisitorMode } from "./visitor-mode";
import styles from "./vitrine.module.css";

export type FamilyWithServices = ServiceFamily & { services: Service[] };
export type CategoryWithProducts = ProductCategory & { products: Product[] };

type Props = {
  page: Page;
  families: FamilyWithServices[];
  productCategories?: CategoryWithProducts[];
  offers?: Offer[];
  onBook?: (service: Service) => void; // absent en préview éditeur
  onAddToCart?: (product: Product) => void; // absent en préview éditeur
  onAddOffer?: (offer: Offer) => void; // absent en préview éditeur
  cartCount?: number;
  onOpenCart?: () => void;
  poweredBy?: boolean;
  preview?: boolean; // préview éditeur : désactive les interactions réseau
};

// Vitrine publique du commerçant, aux couleurs qu'il a choisies.
// Utilisée en SSR sur /p/[slug] et en préview live dans l'éditeur.
// Le socle (wrapper thème, footer, FABs, modale légale) vit dans VitrineShell,
// partagé avec les sous-pages (vitrine-subpage).
export function VitrineView({
  page,
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

  const hasServices = families.length > 0;
  const activeOffers = offers.filter((o) => o.active);

  const sections = resolveSections(page).filter((s) => s.enabled);
  const plan = buildPlan(sections);
  const offersVisible =
    activeOffers.length > 0 && sections.some((s) => s.type === "offres");
  const primaryAnchor = offersVisible ? "#offres" : "#prestations";
  const lastGroupIndex = plan.reduce(
    (acc, item, i) => (item.kind === "group" ? i : acc),
    -1
  );
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

  const address = (page.address || page.city) && (
    <p className={styles.address}>
      <MapPin aria-hidden="true" />{" "}
      {[page.address, page.city].filter(Boolean).join(" · ")}
    </p>
  );

  return (
    <VitrineShell
      page={page}
      poweredBy={poweredBy}
      cartCount={cartCount}
      onOpenCart={onOpenCart}
    >
      {/* Bandeau promo au-dessus du hero (position historique) */}
      {plan[0]?.kind === "promo" && <PromoBanner page={page} accent={accent} />}

      {/* Hero — fixe, hors sections */}
      <header
        className={`${styles.hero} ${page.hero_url ? styles.heroWithImage : ""} ${
          page.colors.heroGradient && !page.hero_video_url && !page.hero_url
            ? styles.heroGradient
            : ""
        }`}
      >
        {page.hero_video_url ? (
          <>
            <video
              className={styles.heroVideo}
              src={page.hero_video_url}
              poster={page.hero_url ?? undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
            <div className={styles.heroOverlay} />
          </>
        ) : (
          page.hero_url && (
            <>
              <Image
                src={page.hero_url}
                alt=""
                fill
                className={styles.heroImage}
                sizes="100vw"
                priority
              />
              <div className={styles.heroOverlay} />
            </>
          )
        )}
        {page.navigation ? (
          <VitrineHeader page={page} currentPath="" preview={preview} />
        ) : (
          <div className={styles.storeNav}>
            <span className={styles.storeNavName}>
              {page.logo_url ? (
                <Image src={page.logo_url} alt="" width={34} height={34} />
              ) : (
                <i>{(page.business_name || "M").charAt(0).toUpperCase()}</i>
              )}
              <b>{page.business_name || "Mon commerce"}</b>
            </span>
            <span className={styles.storeNavActions}>
              <button
                type="button"
                className={styles.modeToggle}
                onClick={toggleMode}
                aria-label={effectiveDark ? "Passer en mode clair" : "Passer en mode sombre"}
              >
                {effectiveDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
              </button>
              <a href={primaryAnchor}>
                {offersVisible ? "Voir les offres" : hasServices ? "Réserver" : "Découvrir"}
              </a>
            </span>
          </div>
        )}
        <div className={styles.heroInner}>
          {page.logo_url && (
            <Image
              src={page.logo_url}
              alt={page.business_name}
              width={88}
              height={88}
              className={styles.logo}
            />
          )}
          {(page.job_title || page.city) && (
            <p className={styles.eyebrow}>
              {[page.job_title, page.city].filter(Boolean).join(" · ")}
            </p>
          )}
          <h1>{page.business_name || "Mon commerce"}</h1>
          {page.tagline && <p className={styles.tagline}>{page.tagline}</p>}
          <div className={styles.heroActions}>
            <a className={styles.heroCta} href={primaryAnchor}>
              {offersVisible
                ? "Voir les offres"
                : hasServices
                  ? "Voir les prestations"
                  : "Découvrir la boutique"}{" "}
              <ArrowRight aria-hidden="true" />
            </a>
            <span className={styles.online}>
              <span />
              {hasServices ? "Réservation en ligne" : "Commande en ligne"}
            </span>
          </div>
        </div>
      </header>

      {plan.map((item, planIndex) => {
        if (item.kind === "promo") {
          // Le bandeau de tête est déjà rendu au-dessus du hero.
          if (planIndex === 0) return null;
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
                  showEmpty={!offersVisible}
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
            {planIndex === lastGroupIndex && address}
          </section>
        );
      })}
      {lastGroupIndex === -1 && address && (
        <section className={styles.services}>{address}</section>
      )}
    </VitrineShell>
  );
}
