"use client";

import { useEffect, useState } from "react";
import type { Offer, Page, Product, Service, SitePage } from "@/lib/types";
import type { Locale } from "@/lib/i18n/config";
import { LOCALE_BCP47 } from "@/lib/i18n/config";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";
import {
  VitrineView,
  type CategoryWithProducts,
  type FamilyWithServices,
} from "./vitrine-view";
import { VitrineSubpage } from "./vitrine-subpage";
import { BookingModal } from "./booking-modal";
import { OrderModal, type CartLine } from "./order-modal";
import { VitrineTracker } from "./vitrine-tracker";
import { resolveStorefrontPresentation } from "@/lib/vitrine-design/resolver";
import styles from "./vitrine.module.css";
import { FluxAssistantHost } from "@/components/assistant/flux-assistant-host";
import type { AssistantDestination } from "@/lib/assistant/types";

type Props = {
  page: Page;
  sitePage?: SitePage; // présent = rendu d'une sous-page (/p/slug/…)
  families: FamilyWithServices[];
  productCategories: CategoryWithProducts[];
  offers: Offer[];
  bookingEnabled: boolean;
  // Langue source de la vitrine (pages.default_locale). Absente en préview
  // éditeur (dashboard) : les composants retombent sur le français.
  locale?: Locale;
  // Langue principale + langues avec une traduction publiée : alimente le
  // globe de langue (absent en préview éditeur, avant publication).
  availableLocales?: Locale[];
  t?: StorefrontDict;
};

// Wrapper client de la vitrine publique : « Réserver » → modal de réservation ;
// « Ajouter » (produit) et « Commander » (offre) → panier mixte + commande.
export function VitrinePublic({
  page,
  sitePage,
  families,
  productCategories,
  offers,
  bookingEnabled,
  locale,
  availableLocales,
  t,
}: Props) {
  // Le root layout pose <html lang> depuis la locale de la requête marketing
  // (proxy.ts), sans rapport avec la langue de la vitrine du commerçant : on
  // la corrige côté client, comme le fait déjà I18nProvider pour le dashboard.
  useEffect(() => {
    if (locale) document.documentElement.lang = LOCALE_BCP47[locale];
  }, [locale]);
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const presentation = resolveStorefrontPresentation(page);
  const accent = presentation.tokens.accent;
  const design = presentation;

  function keyOf(kind: CartLine["kind"], id: string) {
    return `${kind}:${id}`;
  }

  function bump(line: Omit<CartLine, "quantity">) {
    const key = keyOf(line.kind, line.id);
    setCart((prev) => ({
      ...prev,
      [key]: { ...line, quantity: (prev[key]?.quantity ?? 0) + 1 },
    }));
    setCartOpen(true);
  }

  function addProduct(product: Product) {
    bump({ kind: "product", id: product.id, name: product.name, price_cents: product.price_cents });
  }

  function addOffer(offer: Offer) {
    bump({ kind: "offer", id: offer.id, name: offer.title, price_cents: offer.price_cents });
  }

  function setQty(kind: CartLine["kind"], id: string, quantity: number) {
    const key = keyOf(kind, id);
    setCart((prev) => {
      const next = { ...prev };
      if (quantity <= 0) delete next[key];
      else if (next[key]) next[key] = { ...next[key], quantity };
      return next;
    });
  }

  const lines = Object.values(cart);
  const cartCount = lines.reduce((sum, it) => sum + it.quantity, 0);
  const storefrontBase = `/p/${page.slug}`;
  const storefrontDestinations: AssistantDestination[] = [
    {
      id: "storefront-home",
      label: "Revenir à l’accueil",
      description: "Retourne au début de cette vitrine.",
      href: storefrontBase,
      surfaces: ["storefront"],
      aliases: ["accueil", "début", "page principale"],
      keywords: ["accueil", "vitrine", "retour"],
    },
    {
      id: "storefront-services",
      label: "Voir les prestations",
      description: "Découvre les services et leurs tarifs.",
      href: `${storefrontBase}#prestations`,
      anchor: "prestations",
      surfaces: ["storefront"],
      aliases: ["services", "prestations", "tarifs"],
      keywords: ["service", "prestation", "prix"],
    },
    {
      id: "storefront-products",
      label: "Voir les produits",
      description: "Parcours les produits disponibles dans cette boutique.",
      href: `${storefrontBase}#boutique`,
      anchor: "boutique",
      surfaces: ["storefront"],
      aliases: ["boutique", "produits", "catalogue", "acheter"],
      keywords: ["produit", "article", "prix", "commande"],
    },
    {
      id: "storefront-offers",
      label: "Voir les offres",
      description: "Retrouve les offres actuellement proposées.",
      href: `${storefrontBase}#offres`,
      anchor: "offres",
      surfaces: ["storefront"],
      aliases: ["promotions", "offres", "réduction"],
      keywords: ["offre", "promotion", "prix"],
    },
    {
      id: "storefront-booking",
      label: "Réserver un rendez-vous",
      description: "Choisis une prestation pour accéder aux créneaux disponibles.",
      href: `${storefrontBase}#reservations`,
      anchor: "reservations",
      surfaces: ["storefront"],
      aliases: ["prendre rendez-vous", "réserver", "créneau"],
      keywords: ["réservation", "rendez-vous", "horaire", "disponibilité"],
    },
    {
      id: "storefront-contact",
      label: "Trouver les coordonnées",
      description: "Retrouve l’adresse, le téléphone et les liens de contact.",
      href: `${storefrontBase}#contact`,
      anchor: "contact",
      surfaces: ["storefront"],
      aliases: ["contacter", "téléphone", "adresse"],
      keywords: ["contact", "adresse", "téléphone", "venir"],
    },
  ];
  const availableStorefrontDestinations = [
    "storefront-home",
    ...(families.some((family) => family.services.length > 0) ? ["storefront-services"] : []),
    ...(productCategories.some((category) => category.products.length > 0) ? ["storefront-products"] : []),
    ...(offers.some((offer) => offer.active) ? ["storefront-offers"] : []),
    ...(bookingEnabled && families.some((family) => family.services.length > 0) ? ["storefront-booking"] : []),
    ...((page.phone || page.address || Object.keys(page.socials ?? {}).length > 0) ? ["storefront-contact"] : []),
  ];

  return (
    <>
      {page.moderation_status === "verified" && (
        <div className={styles.verifiedBadge} title={t?.verifiedBadge.title ?? "Cette version de la boutique a été contrôlée par FLUX."}>
          <span aria-hidden="true">✓</span> {t?.verifiedBadge.label ?? "Boutique vérifiée"}
        </div>
      )}
      {/* Tracking uniquement sur la vraie vitrine publique, jamais en préview. */}
      <VitrineTracker slug={page.slug} pageId={page.id} />
      {sitePage ? (
        <VitrineSubpage
          page={page}
          sitePage={sitePage}
          families={families}
          productCategories={productCategories}
          offers={offers}
          onBook={bookingEnabled ? setBookingService : undefined}
          onAddToCart={addProduct}
          onAddOffer={addOffer}
          cartCount={cartCount}
          onOpenCart={() => setCartOpen(true)}
          poweredBy={!page.hide_branding}
          locale={locale}
          availableLocales={availableLocales}
          t={t}
        />
      ) : (
        <VitrineView
          page={page}
          families={families}
          productCategories={productCategories}
          offers={offers}
          onBook={bookingEnabled ? setBookingService : undefined}
          onAddToCart={addProduct}
          onAddOffer={addOffer}
          cartCount={cartCount}
          onOpenCart={() => setCartOpen(true)}
          poweredBy={!page.hide_branding}
          locale={locale}
          availableLocales={availableLocales}
          t={t}
        />
      )}
      {bookingService && (
        <BookingModal
          slug={page.slug}
          service={bookingService}
          accentColor={accent}
          designId={design.components.booking.renderId}
          buttonDesignId={design.components.button.renderId}
          onClose={() => setBookingService(null)}
          locale={locale}
          t={t?.booking}
        />
      )}
      {cartOpen && (
        <OrderModal
          pageId={page.id}
          items={lines}
          accentColor={accent}
          designId={design.components.order.renderId}
          buttonDesignId={design.components.button.renderId}
          onSetQty={setQty}
          onClose={() => setCartOpen(false)}
          onDone={() => setCart({})}
          t={t?.order}
        />
      )}
      {page.assistant_enabled && (
        <FluxAssistantHost
          surface="storefront"
          context={{
            activeProjectId: page.id,
            availableDestinationIds: availableStorefrontDestinations,
          }}
          extraDestinations={storefrontDestinations}
        />
      )}
    </>
  );
}
