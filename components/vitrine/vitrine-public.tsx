"use client";

import { useState } from "react";
import type { Offer, Page, Product, Service, SitePage } from "@/lib/types";
import {
  VitrineView,
  type CategoryWithProducts,
  type FamilyWithServices,
} from "./vitrine-view";
import { VitrineSubpage } from "./vitrine-subpage";
import { BookingModal } from "./booking-modal";
import { OrderModal, type CartLine } from "./order-modal";
import { VitrineTracker } from "./vitrine-tracker";
import { resolveVitrineDesign } from "@/lib/vitrine-design/resolver";
import styles from "./vitrine.module.css";

type Props = {
  page: Page;
  sitePage?: SitePage; // présent = rendu d'une sous-page (/p/slug/…)
  families: FamilyWithServices[];
  productCategories: CategoryWithProducts[];
  offers: Offer[];
  bookingEnabled: boolean;
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
}: Props) {
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const accent = page.colors.primary || "#d31212";
  const design = resolveVitrineDesign(page.theme || "editorial", page.design);

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

  return (
    <>
      {page.moderation_status === "verified" && (
        <div className={styles.verifiedBadge} title="Cette version de la boutique a été contrôlée par FLUX.">
          <span aria-hidden="true">✓</span> Boutique vérifiée
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
        />
      )}
    </>
  );
}
