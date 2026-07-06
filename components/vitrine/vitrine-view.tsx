"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Offer, Page, Product, ProductCategory, Service, ServiceFamily } from "@/lib/types";
import { getFont } from "@/lib/verticals";
import { defaultLegal } from "@/lib/legal";
import { resolveSections, type PageSection } from "@/lib/sections";
import {
  ArrowRight,
  MapPin,
  MessageCircle,
  Moon,
  Phone,
  ShoppingBag,
  Sparkles,
  Sun,
} from "lucide-react";
import { PromoBanner } from "./sections/promo-banner";
import { OffersSection } from "./sections/offers-section";
import { CatalogSection } from "./sections/catalog-section";
import { SectionRenderer, type SectionContext } from "./section-renderer";
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

// Élément du plan de rendu : les sections pleine largeur (promo, offres)
// vivent seules ; les autres sont regroupées dans un wrapper .services.
// Boutique + prestations adjacentes fusionnent dans le bloc catalogue
// historique (un seul titre, produits en haut, réservations en bas).
type PlanItem =
  | { kind: "promo" }
  | { kind: "offres"; section: PageSection }
  | { kind: "group"; items: GroupItem[] };
type GroupItem =
  | { kind: "catalogue"; key: string }
  | { kind: "section"; key: string; section: PageSection };

function buildPlan(sections: PageSection[]): PlanItem[] {
  const plan: PlanItem[] = [];
  let group: GroupItem[] | null = null;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (section.type === "promo") {
      group = null;
      plan.push({ kind: "promo" });
      continue;
    }
    if (section.type === "offres") {
      group = null;
      plan.push({ kind: "offres", section });
      continue;
    }
    if (!group) {
      group = [];
      plan.push({ kind: "group", items: group });
    }
    const next = sections[i + 1];
    const pair =
      (section.type === "boutique" && next?.type === "prestations") ||
      (section.type === "prestations" && next?.type === "boutique");
    if (pair) {
      group.push({ kind: "catalogue", key: "catalogue" });
      i++;
    } else {
      group.push({ kind: "section", key: section.id, section });
    }
  }
  return plan;
}

const MODE_KEY = "ww-vitrine-mode";
const MODE_EVENT = "ww-vitrine-mode-change";

function subscribeVisitorMode(callback: () => void) {
  window.addEventListener(MODE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(MODE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function readVisitorMode(): "dark" | "light" | null {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    return saved === "dark" || saved === "light" ? saved : null;
  } catch {
    return null;
  }
}

// Vitrine publique du commerçant, aux couleurs qu'il a choisies.
// Utilisée en SSR sur /p/[slug] et en préview live dans l'éditeur.
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
  const [legalOpen, setLegalOpen] = useState<string | null>(null);
  // Mode sombre/clair choisi par le visiteur, persisté en localStorage.
  // null = palette du thème (et snapshot SSR, appliqué jusqu'à l'hydratation).
  const visitorMode = useSyncExternalStore(
    subscribeVisitorMode,
    readVisitorMode,
    () => null
  );
  const darkTheme = ["studio", "luxe", "neon"].includes(page.theme);
  const effectiveDark = visitorMode ? visitorMode === "dark" : darkTheme;
  const toggleMode = () => {
    try {
      localStorage.setItem(MODE_KEY, effectiveDark ? "light" : "dark");
      window.dispatchEvent(new Event(MODE_EVENT));
    } catch {}
  };
  const useCustomSurfaces =
    !visitorMode || (visitorMode === "dark") === darkTheme;

  const colors = {
    primary: page.colors.primary || "#d31212",
    dark: page.colors.dark || "#0a0a0a",
    text: page.colors.text || "#1c1c1c",
  };
  const font = getFont(page.font);
  const legal = { ...defaultLegal(page.business_name), ...page.legal };

  const socials = Object.entries(page.socials || {}).filter(([, v]) => v);
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
    accent: colors.primary,
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
    <div
      className={styles.page}
      data-theme={page.theme || "editorial"}
      data-mode={visitorMode ?? undefined}
      style={
        {
          fontFamily: font.css,
          "--client-accent": colors.primary,
          "--client-dark": colors.dark,
          // Fond/cartes personnalisés — ignorés quand le visiteur force un
          // mode opposé au thème (les variables inline gagneraient sur le CSS).
          ...(page.colors.background && useCustomSurfaces
            ? { "--store-bg": page.colors.background }
            : {}),
          ...(page.colors.card && useCustomSurfaces
            ? { "--store-surface": page.colors.card }
            : {}),
        } as React.CSSProperties
      }
    >
      {/* Bandeau promo au-dessus du hero (position historique) */}
      {plan[0]?.kind === "promo" && (
        <PromoBanner page={page} accent={colors.primary} />
      )}

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
          return <PromoBanner key="promo" page={page} accent={colors.primary} />;
        }
        if (item.kind === "offres") {
          const settings = item.section.settings as
            | { title?: string; subtitle?: string }
            | undefined;
          return (
            <OffersSection
              key="offres"
              offers={activeOffers}
              accent={colors.primary}
              onAddOffer={onAddOffer}
              title={settings?.title}
              subtitle={settings?.subtitle}
            />
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
                  accent={colors.primary}
                  onBook={onBook}
                  onAddToCart={onAddToCart}
                  showEmpty={!offersVisible}
                  first={entryIndex === 0}
                />
              ) : (
                <SectionRenderer
                  key={entry.key}
                  section={entry.section}
                  first={entryIndex === 0}
                  ctx={ctx}
                />
              )
            )}
            {planIndex === lastGroupIndex && address}
          </section>
        );
      })}
      {lastGroupIndex === -1 && address && (
        <section className={styles.services}>{address}</section>
      )}

      {/* Bouton flottant WhatsApp / appel */}
      {page.floating_cta?.number && (
        <a
          className={styles.contactFab}
          data-track={page.floating_cta.type === "whatsapp" ? "whatsapp" : "phone"}
          href={
            page.floating_cta.type === "whatsapp"
              ? `https://wa.me/${page.floating_cta.number.replace(/[^0-9]/g, "")}`
              : `tel:${page.floating_cta.number}`
          }
          target={page.floating_cta.type === "whatsapp" ? "_blank" : undefined}
          rel="noreferrer"
          aria-label={
            page.floating_cta.type === "whatsapp"
              ? "Écrire sur WhatsApp"
              : "Appeler"
          }
        >
          {page.floating_cta.type === "whatsapp" ? (
            <MessageCircle aria-hidden="true" />
          ) : (
            <Phone aria-hidden="true" />
          )}
        </a>
      )}

      {/* Panier flottant */}
      {onOpenCart && cartCount > 0 && (
        <button
          type="button"
          onClick={onOpenCart}
          className={styles.cartFab}
          style={{ backgroundColor: colors.primary }}
        >
          <ShoppingBag aria-hidden="true" />
          <span>Voir le panier</span>
          <span className={styles.cartFabCount}>{cartCount}</span>
        </button>
      )}

      {/* Footer */}
      <footer className={styles.footer} style={{ backgroundColor: colors.dark }}>
        <p className={styles.footerKicker}>Restons en contact</p>
        <h2>{page.business_name || "Mon commerce"}</h2>
        {page.phone && (
          <p className={styles.phone}>
            <a href={`tel:${page.phone}`}>
              <Phone aria-hidden="true" /> {page.phone}
            </a>
          </p>
        )}
        {socials.length > 0 && (
          <p className={styles.socials}>
            {socials.map(([network, handle]) => (
              <span key={network} className="capitalize">
                {network} : {handle}
              </span>
            ))}
          </p>
        )}
        <p className={styles.legalLinks}>
          {(["mentions", "cgv", "confidentialite"] as const).map((key, i) => (
            <span key={key}>
              {i > 0 && " · "}
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={() => setLegalOpen(key)}
              >
                {key === "mentions"
                  ? "Mentions légales"
                  : key === "cgv"
                    ? "CGV"
                    : "Confidentialité"}
              </button>
            </span>
          ))}
        </p>
        {poweredBy && (
          <p className={styles.powered}>
            <Sparkles aria-hidden="true" />
            Créé avec <Link href="/">Wayne Web Flux</Link>
          </p>
        )}
      </footer>

      {/* Modale légale */}
      {legalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setLegalOpen(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                {legalOpen === "mentions"
                  ? "Mentions légales"
                  : legalOpen === "cgv"
                    ? "Conditions générales de vente"
                    : "Politique de confidentialité"}
              </h3>
              <button
                type="button"
                onClick={() => setLegalOpen(null)}
                aria-label="Fermer"
                className={styles.close}
              >
                ×
              </button>
            </div>
            <pre>{legal[legalOpen as keyof typeof legal]}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
