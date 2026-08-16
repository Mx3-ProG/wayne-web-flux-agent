import { createAdminClient } from "@/lib/supabase/admin";
import { loadBookingContextForPage } from "./context";
import { createAppointment, type CreateAppointmentResult } from "./create-appointment";
import { cancelAppointment } from "./cancel-appointment";

export type RescheduleAppointmentResult =
  | CreateAppointmentResult
  | { ok: false; error: "not_found" };

// Un rendez-vous existant n'est jamais modifié en place : on recrée sur le
// nouveau créneau (même chemin, mêmes garanties que create_appointment), puis
// on ferme l'ancien. Dans cet ordre précis — la nouvelle réservation doit
// réussir avant qu'on renonce à l'ancienne, pour ne jamais faire perdre son
// rendez-vous à un client sur un échec réseau ou un créneau repris entre-temps.
export async function rescheduleAppointment(
  pageId: string,
  bookingId: string,
  input: { date: string; time: string }
): Promise<RescheduleAppointmentResult> {
  const supabase = createAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, service_id, first_name, phone, email, status")
    .eq("id", bookingId)
    .eq("page_id", pageId)
    .in("status", ["pending", "confirmed"])
    .maybeSingle<{
      id: string;
      service_id: string | null;
      first_name: string;
      phone: string;
      email: string | null;
      status: string;
    }>();
  if (!booking || !booking.service_id) return { ok: false, error: "not_found" };

  const bookingCtx = await loadBookingContextForPage(pageId, booking.service_id);
  if (!bookingCtx) return { ok: false, error: "not_found" };

  const created = await createAppointment(bookingCtx, {
    date: input.date,
    time: input.time,
    firstName: booking.first_name,
    phone: booking.phone,
    email: booking.email,
  });
  if (!created.ok) return created;

  const cancelled = await cancelAppointment(pageId, bookingId);
  if (!cancelled.ok) {
    // La nouvelle réservation existe déjà et a été confirmée au client :
    // on log pour une reprise manuelle plutôt que d'annuler ce qui vient
    // d'être créé avec succès.
    console.error("booking: reschedule cleanup failed", { pageId, bookingId });
  }
  return created;
}
