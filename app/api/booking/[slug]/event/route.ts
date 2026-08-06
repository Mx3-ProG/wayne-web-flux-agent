import { NextResponse } from "next/server";
import { slotsForDate } from "@/lib/slots";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { enforceKarlMada } from "@/lib/karlmada";
import { sendBookingCreatedEmails } from "@/lib/emails/booking-emails";
import { loadBookingContext } from "../route-helpers";

const PHONE_RE = /^[+0-9 ().-]{6,20}$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!await rateLimit(`event:${clientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const serviceId = String(body.service_id ?? "");
  const date = String(body.date ?? "");
  const time = String(body.time ?? "");
  const firstName = String(body.first_name ?? "").trim().slice(0, 60);
  const phone = String(body.phone ?? "").trim();
  const email = String(body.email ?? "").trim().slice(0, 120) || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
  }
  if (!firstName || !PHONE_RE.test(phone)) {
    return NextResponse.json({ error: "invalid_contact" }, { status: 400 });
  }

  // Même règle que pour les commandes : on ne modère QUE les champs saisis par
  // le visiteur, et sans userId — un client ne doit jamais pouvoir faire
  // suspendre le compte du professionnel. Le prénom atterrit dans le CRM, dans
  // l'agenda et dans une notification push : il ne peut pas rester libre.
  const customerModeration = await enforceKarlMada(
    { firstName },
    { surface: "booking:customer-input" }
  );
  if (customerModeration.error) {
    return NextResponse.json(
      { error: "content_blocked", message: customerModeration.error },
      { status: 422 }
    );
  }

  const ctx = await loadBookingContext(slug, serviceId);
  if (!ctx) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Re-vérifie que le créneau est toujours libre côté serveur.
  const slots = slotsForDate(date, {
    schedules: ctx.schedules,
    blocked: ctx.blocked,
    bookings: ctx.bookings,
    durationMin: ctx.service.duration_min,
  });
  if (!slots.includes(time)) {
    return NextResponse.json({ error: "slot_taken" }, { status: 409 });
  }

  // Validation obligatoire : la demande arrive en attente, la commerçante
  // l'accepte ou la refuse depuis son agenda.
  const { error: insertError } = await ctx.supabase.from("bookings").insert({
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
  });
  if (insertError) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
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

  return new NextResponse(null, { status: 204 });
}
