import { slotsForDate } from "@/lib/slots";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { sendBookingCreatedEmails } from "@/lib/emails/booking-emails";
import type { BookingContext } from "./context";

export type CreateAppointmentInput = {
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  firstName: string;
  phone: string;
  email: string | null;
};

export type CreateAppointmentResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: "slot_taken" | "insert_failed" };

// Cœur métier de la prise de rendez-vous : re-vérifie la disponibilité côté
// serveur, enregistre la demande (toujours en `pending`, jamais auto-confirmée
// — la commerçante valide depuis son agenda), met à jour le CRM, notifie le
// professionnel et envoie les emails. Appelé par la vitrine publique
// (app/api/booking/[slug]/event) et par FLUX Voice — même chemin, mêmes
// garanties, aucune logique dupliquée.
//
// Modération et validation de format (nom, téléphone) restent à la charge de
// l'appelant : elles diffèrent selon le canal (formulaire web vs. transcription
// vocale) alors que l'écriture en base, elle, ne doit jamais diverger.
export async function createAppointment(
  ctx: BookingContext,
  input: CreateAppointmentInput
): Promise<CreateAppointmentResult> {
  const { date, time, firstName, phone, email } = input;

  const slots = slotsForDate(date, {
    schedules: ctx.schedules,
    blocked: ctx.blocked,
    bookings: ctx.bookings,
    durationMin: ctx.service.duration_min,
  });
  if (!slots.includes(time)) {
    return { ok: false, error: "slot_taken" };
  }

  const { data: inserted, error: insertError } = await ctx.supabase
    .from("bookings")
    .insert({
      page_id: ctx.page.id,
      service_id: ctx.service.id,
      service_name: ctx.service.name,
      duration_min: ctx.service.duration_min,
      price_cents: ctx.service.price_cents,
      date,
      start_time: time,
      first_name: firstName,
      phone,
      email,
      status: "pending",
    })
    .select("id")
    .single<{ id: string }>();
  if (insertError || !inserted) {
    return { ok: false, error: "insert_failed" };
  }

  // CRM : le client est créé/mis à jour automatiquement à chaque réservation.
  await ctx.supabase
    .from("customers")
    .upsert(
      { page_id: ctx.page.id, phone, first_name: firstName, email },
      { onConflict: "page_id,phone" }
    );

  // Notification propriétaire (feed générique commandes + réservations), dans
  // la langue de son compte. Le libellé est partagé avec l'email qu'il reçoit
  // au même moment, pour ne pas maintenir deux formulations.
  const ownerDict = await getDictionary(ctx.ownerLocale, "emails");
  const notificationTitle = ownerDict.booking.sellerNew.title;
  await ctx.supabase.from("notifications").insert({
    user_id: ctx.page.user_id,
    page_id: ctx.page.id,
    type: "booking",
    ref_id: null,
    title: notificationTitle,
    body: `${firstName} · ${ctx.service.name} · ${date} ${time}`,
  });

  // Emails AWAITés avant la réponse, comme pour les commandes : les callbacks
  // after() ne sont pas honorés ici sur Vercel. Le client repart avec un accusé
  // de réception écrit (la demande part en `pending`), le professionnel avec
  // l'alerte. Un échec d'envoi ne casse pas la réservation déjà enregistrée.
  try {
    await sendBookingCreatedEmails({
      pageId: ctx.page.id,
      firstName,
      phone,
      buyerEmail: email,
      serviceName: ctx.service.name,
      date,
      startTime: time,
    });
  } catch (e) {
    console.error("booking: email dispatch failed", e);
  }

  return { ok: true, bookingId: inserted.id };
}
