import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingStatusEmail } from "@/lib/emails/booking-emails";
import { syncBookingToConnectors } from "@/lib/integrations/sync-hooks";

export type CancelAppointmentResult = { ok: true } | { ok: false; error: "not_found" };

// Annulation scopée `page_id` plutôt que par RLS (auth.uid()) : utilisée par
// des appelants sans session utilisateur, comme FLUX Voice, qui agissent avec
// le client admin après avoir résolu le tenant côté serveur (jamais fourni
// par l'appelant). L'équivalent pour l'agenda (app/(app)/agenda/actions.ts,
// cancelBooking) reste inchangé : mêmes effets métier (email + sync
// connecteurs), mécanisme d'autorisation différent — pas dupliqué par choix,
// dupliqué par nécessité.
export async function cancelAppointment(
  pageId: string,
  bookingId: string
): Promise<CancelAppointmentResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("page_id", pageId)
    .in("status", ["pending", "confirmed"])
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "not_found" };

  await sendBookingStatusEmail(bookingId, "cancelled").catch((e) =>
    console.error("booking: cancel email failed", { bookingId, e })
  );
  await syncBookingToConnectors(bookingId, "cancelled").catch((e) =>
    console.error("booking: cancel sync failed", { bookingId, e })
  );
  return { ok: true };
}
