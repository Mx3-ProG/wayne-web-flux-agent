import { z } from "zod";
import { defineTool } from "./types";
import { loadBookingContextForPage } from "@/lib/booking/context";
import { slotsForDate, availableDays } from "@/lib/slots";

// Seule source de vérité pour la disponibilité : `lib/slots.ts`, déjà utilisée
// par la vitrine publique. L'agent n'a aucun autre moyen de connaître un
// créneau — il ne doit jamais en inventer un.
export const getAvailableSlotsTool = defineTool({
  name: "get_available_slots",
  description:
    "Renvoie les créneaux réellement disponibles pour une prestation. Fournir une date précise (YYYY-MM-DD) pour les horaires exacts d'un jour, ou omettre la date pour un aperçu des prochains jours ouverts.",
  schema: z.object({
    serviceId: z.string().describe("id de la prestation, obtenu via get_services"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("date au format YYYY-MM-DD ; omis = aperçu des prochains jours"),
  }),
  permission: null,
  execute: async (ctx, input) => {
    const bookingCtx = await loadBookingContextForPage(ctx.pageId, input.serviceId);
    if (!bookingCtx) return { error: "service_not_found" };

    const slotInput = {
      schedules: bookingCtx.schedules,
      blocked: bookingCtx.blocked,
      bookings: bookingCtx.bookings,
      durationMin: bookingCtx.service.duration_min,
    };

    if (input.date) {
      return { date: input.date, slots: slotsForDate(input.date, slotInput) };
    }
    return { days: availableDays(slotInput) };
  },
});
