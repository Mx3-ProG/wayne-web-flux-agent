import { NextResponse } from "next/server";
import { slotsForDate } from "@/lib/slots";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { loadBookingContext } from "@/lib/booking/context";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!await rateLimit(`slots:${clientIp(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const url = new URL(request.url);
  const serviceId = url.searchParams.get("service") ?? "";
  const date = url.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  const ctx = await loadBookingContext(slug, serviceId);
  if (!ctx) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const slots = slotsForDate(date, {
    schedules: ctx.schedules,
    blocked: ctx.blocked,
    bookings: ctx.bookings,
    durationMin: ctx.service.duration_min,
  });

  return NextResponse.json({ slots });
}
