import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { enforceKarlMada } from "@/lib/karlmada";
import { loadBookingContext } from "@/lib/booking/context";
import { createAppointment } from "@/lib/booking/create-appointment";

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

  const result = await createAppointment(ctx, { date, time, firstName, phone, email });
  if (!result.ok) {
    const status = result.error === "slot_taken" ? 409 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return new NextResponse(null, { status: 204 });
}
