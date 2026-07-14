"use client";

// Socle commun de la vitrine, partagé entre la home (vitrine-view) et les
// sous-pages (vitrine-subpage) : wrapper aux couleurs du commerçant (CSS
// vars + data-theme + mode visiteur), bouton flottant de contact, panier
// flottant, footer et modale légale.

import { useState } from "react";
import Link from "next/link";
import type { Page } from "@/lib/types";
import { getFont } from "@/lib/verticals";
import { defaultLegal } from "@/lib/legal";
import { MessageCircle, Phone, ShoppingBag, Sparkles } from "lucide-react";
import { isDarkTheme, useVisitorMode } from "./visitor-mode";
import { ScrollTopButton } from "./scroll-top-button";
import styles from "./vitrine.module.css";
import { resolveVitrineDesign } from "@/lib/vitrine-design/resolver";

type Props = {
  page: Page;
  poweredBy?: boolean;
  cartCount?: number;
  onOpenCart?: () => void;
  children: React.ReactNode;
};

export function VitrineShell({
  page,
  poweredBy = true,
  cartCount = 0,
  onOpenCart,
  children,
}: Props) {
  const [legalOpen, setLegalOpen] = useState<string | null>(null);
  const design = resolveVitrineDesign(page.theme || "editorial", page.design);
  const { visitorMode, useCustomSurfaces } = useVisitorMode(isDarkTheme(page.theme));

  const colors = {
    primary: page.colors.primary || "#d31212",
    dark: page.colors.dark || "#0a0a0a",
  };
  const font = getFont(page.font);

  // Typographie fine (pages.typography) : échelle des titres et police de
  // titres distincte du corps. Absente = rendu historique inchangé.
  const typography = page.typography ?? {};
  const headingScale =
    typography.headingScale && typography.headingScale !== "m"
      ? { s: 0.85, m: 1, l: 1.12, xl: 1.28 }[typography.headingScale]
      : null;
  const headingFont =
    typography.headingFont && typography.headingFont !== page.font
      ? getFont(typography.headingFont)
      : null;
  const legal = { ...defaultLegal(page.business_name), ...page.legal };
  const socials = Object.entries(page.socials || {}).filter(([, v]) => v);

  return (
    <div
      className={styles.page}
      data-theme={page.theme || "editorial"}
      data-design-kit={design.kit.id}
      data-design-button={design.components.button.renderId}
      data-design-navigation={design.components.navigation.renderId}
      data-design-header={design.components.header.renderId}
      data-design-footer={design.components.footer.renderId}
      data-design-section={design.components.section.renderId}
      data-design-category={design.components.category.renderId}
      data-design-product={design.components.product.renderId}
      data-design-cart={design.components.cart.renderId}
      data-design-order={design.components.order.renderId}
      data-design-booking={design.components.booking.renderId}
      data-design-legal={design.components.legal.renderId}
      data-design-checkout={design.components.checkout.renderId}
      data-mode={visitorMode ?? undefined}
      data-heading-scale={headingScale ? typography.headingScale : undefined}
      data-heading-font={headingFont ? "1" : undefined}
      style={
        {
          fontFamily: font.css,
          "--client-accent": colors.primary,
          "--client-dark": colors.dark,
          ...(headingScale ? { "--heading-scale": headingScale } : {}),
          ...(headingFont ? { "--client-heading-font": headingFont.css } : {}),
          ...(page.colors.background && useCustomSurfaces
            ? { "--store-bg": page.colors.background }
            : {}),
          ...(page.colors.card && useCustomSurfaces
            ? { "--store-surface": page.colors.card }
            : {}),
        } as React.CSSProperties
      }
    >
      {children}

      {/* Bouton « remonter en haut » */}
      {page.scroll_top && <ScrollTopButton />}

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
