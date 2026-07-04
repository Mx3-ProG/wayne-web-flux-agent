import { NextResponse } from "next/server";
import { slotsForDate } from "@/lib/slots";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { loadBookingContext } from "../route-helpers";

const PHONE_RE = /^[+0-9 ().-]{6,20}$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!rateLimit(`event:${clientIp(request)}`, 5, 60_000)) {
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

  // Notification propriétaire (feed générique commandes + réservations).
  await ctx.supabase.from("notifications").insert({
    user_id: ctx.page.user_id,
    page_id: ctx.page.id,
    type: "booking",
    ref_id: null,
    title: "Nouvelle réservation",
    body: `${firstName} · ${ctx.service.name} · ${date} à ${time}`,
  });

  return new NextResponse(null, { status: 204 });
}
