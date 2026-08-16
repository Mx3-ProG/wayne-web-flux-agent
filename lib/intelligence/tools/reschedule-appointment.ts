import { z } from "zod";
import { defineTool } from "./types";
import { rescheduleAppointment as rescheduleAppointmentService } from "@/lib/booking/reschedule-appointment";

export const rescheduleAppointmentTool = defineTool({
  name: "reschedule_appointment",
  description:
    "Déplace un rendez-vous existant vers un nouveau créneau (vérifié au préalable avec get_available_slots).",
  schema: z.object({
    bookingId: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  permission: "allowRescheduling",
  execute: async (ctx, input) =>
    rescheduleAppointmentService(ctx.pageId, input.bookingId, { date: input.date, time: input.time }),
});
