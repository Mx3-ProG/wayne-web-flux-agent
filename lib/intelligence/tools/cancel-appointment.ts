import { z } from "zod";
import { defineTool } from "./types";
import { cancelAppointment as cancelAppointmentService } from "@/lib/booking/cancel-appointment";

export const cancelAppointmentTool = defineTool({
  name: "cancel_appointment",
  description: "Annule un rendez-vous existant à la demande du client.",
  schema: z.object({ bookingId: z.string() }),
  permission: "allowCancellation",
  execute: async (ctx, input) => cancelAppointmentService(ctx.pageId, input.bookingId),
});
