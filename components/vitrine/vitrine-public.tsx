"use client";

import { useState } from "react";
import type { Page, Product, Service } from "@/lib/types";
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
  bookingEnabled: boolean;
};

// Wrapper client de la vitrine publique : branche « Réserver » sur la modal de
// réservation et « Ajouter » sur un panier + modal de commande.
export function VitrinePublic({ page, families, productCategories, bookingEnabled }: Props) {
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const accent = page.colors.primary || "#d31212";

  function addToCart(product: Product) {
    setCart((prev) => {
      const line = prev[product.id];
      return { ...prev, [product.id]: { product, quantity: (line?.quantity ?? 0) + 1 } };
    });
    setCartOpen(true);
  }

  function setQty(productId: string, quantity: number) {
    setCart((prev) => {
      const next = { ...prev };
      if (quantity <= 0) delete next[productId];
      else if (next[productId]) next[productId] = { ...next[productId], quantity };
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
        onBook={bookingEnabled ? setBookingService : undefined}
        onAddToCart={addToCart}
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
          slug={page.slug}
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
