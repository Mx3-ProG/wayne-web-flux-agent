import { NextResponse } from "next/server";
import { availableDays } from "@/lib/slots";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { loadBookingContext } from "../route-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!rateLimit(`days:${clientIp(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const serviceId = new URL(request.url).searchParams.get("service") ?? "";
  const ctx = await loadBookingContext(slug, serviceId);
  if (!ctx) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const days = availableDays({
    schedules: ctx.schedules,
    blocked: ctx.blocked,
    bookings: ctx.bookings,
    durationMin: ctx.service.duration_min,
  });

  return NextResponse.json({ days });
}
