import { z } from "zod";
import { defineTool } from "./types";
import { loadBookingContextForPage } from "@/lib/booking/context";
import { createAppointment as createAppointmentService } from "@/lib/booking/create-appointment";
import { enforceKarlMada } from "@/lib/karlmada";

const PHONE_RE = /^[+0-9 ().-]{6,20}$/;

export const createAppointmentTool = defineTool({
  name: "create_appointment",
  description:
    "Réserve un rendez-vous. N'utiliser QUE sur un créneau retourné par get_available_slots pour la même prestation et la même date : n'invente jamais un créneau.",
  schema: z.object({
    serviceId: z.string().describe("id de la prestation, obtenu via get_services"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    firstName: z.string().min(1).max(60),
    phone: z.string(),
    email: z.string().email().optional(),
  }),
  permission: "allowBooking",
  execute: async (ctx, input) => {
    if (!PHONE_RE.test(input.phone)) return { ok: false, error: "invalid_phone" };

    // Même règle que la vitrine publique : seul le champ saisi par l'appelant
    // est modéré, sans userId — il ne peut jamais faire suspendre le compte
    // du professionnel.
    const moderation = await enforceKarlMada(
      { firstName: input.firstName },
      { surface: "voice:customer-input", pageId: ctx.pageId }
    );
    if (moderation.error) return { ok: false, error: "content_blocked" };

    const bookingCtx = await loadBookingContextForPage(ctx.pageId, input.serviceId);
    if (!bookingCtx) return { ok: false, error: "service_not_found" };

    return createAppointmentService(bookingCtx, {
      date: input.date,
      time: input.time,
      firstName: input.firstName,
      phone: input.phone,
      email: input.email ?? null,
    });
  },
});
