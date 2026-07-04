"use client";

import { useState } from "react";
import type { Offer, Page, Product, Service } from "@/lib/types";
import {
  VitrineView,
  type CategoryWithProducts,
  type FamilyWithServices,
} from "./vitrine-view";
import { BookingModal } from "./booking-modal";
import { OrderModal, type CartLine } from "./order-modal";

type Props = {
  page: Page;
  families: FamilyWithServices[];
  productCategories: CategoryWithProducts[];
  offers: Offer[];
  bookingEnabled: boolean;
};

// Wrapper client de la vitrine publique : « Réserver » → modal de réservation ;
// « Ajouter » (produit) et « Commander » (offre) → panier mixte + commande.
export function VitrinePublic({
  page,
  families,
  productCategories,
  offers,
  bookingEnabled,
}: Props) {
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const accent = page.colors.primary || "#d31212";

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
      />
      {bookingService && (
        <BookingModal
          slug={page.slug}
          service={bookingService}
          accentColor={accent}
          onClose={() => setBookingService(null)}
        />
      )}
      {cartOpen && (
        <OrderModal
          pageId={page.id}
          items={lines}
          accentColor={accent}
          onSetQty={setQty}
          onClose={() => setCartOpen(false)}
          onDone={() => setCart({})}
        />
      )}
    </>
  );
}
