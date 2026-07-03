import { createAdminClient } from "@/lib/supabase/admin";

// Flux iCal en lecture seule : à coller une fois dans Google Agenda.
// Le token (UUID) fait office de secret ; il est propre à chaque compte.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/.test(token)) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("ical_token", token)
    .single();
  if (!profile) return new Response("Not found", { status: 404 });

  const { data: page } = await supabase
    .from("pages")
    .select("id, business_name")
    .eq("user_id", profile.user_id)
    .maybeSingle();
  if (!page) return new Response("Not found", { status: 404 });

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("page_id", page.id)
    .eq("status", "confirmed")
    .gte("date", since.toISOString().slice(0, 10))
    .order("date");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wayne Web Flux//Agenda//FR",
    `X-WR-CALNAME:${escapeIcs(page.business_name || "Mes rendez-vous")}`,
    "X-WR-TIMEZONE:Europe/Paris",
  ];

  for (const b of bookings ?? []) {
    const start = `${b.date.replace(/-/g, "")}T${String(b.start_time).slice(0, 5).replace(":", "")}00`;
    const endMinutes =
      parseInt(String(b.start_time).slice(0, 2), 10) * 60 +
      parseInt(String(b.start_time).slice(3, 5), 10) +
      b.duration_min;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
    const endM = String(endMinutes % 60).padStart(2, "0");
    const end = `${b.date.replace(/-/g, "")}T${endH}${endM}00`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${b.id}@wayne-web-flux`,
      `DTSTART;TZID=Europe/Paris:${start}`,
      `DTEND;TZID=Europe/Paris:${end}`,
      `SUMMARY:${escapeIcs(`${b.first_name} — ${b.service_name}`)}`,
      `DESCRIPTION:${escapeIcs(`Tél : ${b.phone}${b.email ? ` · ${b.email}` : ""}`)}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
