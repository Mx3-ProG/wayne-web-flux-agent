"use client";

import { useState } from "react";
import type { Page, Service } from "@/lib/types";
import { VitrineView, type FamilyWithServices } from "./vitrine-view";
import { BookingModal } from "./booking-modal";

type Props = {
  page: Page;
  families: FamilyWithServices[];
  bookingEnabled: boolean;
};

// Wrapper client de la vitrine publique : branche le bouton « Réserver »
// sur la modal de réservation.
export function VitrinePublic({ page, families, bookingEnabled }: Props) {
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const accent = page.colors.primary || "#d31212";

  return (
    <>
      <VitrineView
        page={page}
        families={families}
        onBook={bookingEnabled ? setBookingService : undefined}
      />
      {bookingService && (
        <BookingModal
          slug={page.slug}
          service={bookingService}
          accentColor={accent}
          onClose={() => setBookingService(null)}
        />
      )}
    </>
  );
}
