// Calcul des créneaux de réservation à partir des horaires d'ouverture,
// des périodes bloquées et des rendez-vous existants.
// Toutes les heures sont en heure locale du commerçant (Europe/Paris).

import type { BlockedPeriod, Booking, Schedule } from "@/lib/types";

export const SLOT_STEP_MIN = 30; // grille de départ des rendez-vous
export const LEAD_TIME_MIN = 60; // délai mini avant le prochain créneau
export const BOOKING_HORIZON_DAYS = 21;
export const TIMEZONE = "Europe/Paris";

export function parisNow(): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("fr-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10),
  };
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function toTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(isoDate: string): number {
  // 0 = dimanche, comme en base
  return new Date(isoDate + "T12:00:00Z").getUTCDay();
}

type SlotInput = {
  schedules: Schedule[];
  blocked: Pick<BlockedPeriod, "start_date" | "end_date">[];
  bookings: Pick<Booking, "date" | "start_time" | "duration_min" | "status">[];
  durationMin: number;
};

export function slotsForDate(date: string, input: SlotInput): string[] {
  const { schedules, blocked, bookings, durationMin } = input;

  if (blocked.some((b) => date >= b.start_date && date <= b.end_date)) return [];

  const schedule = schedules.find((s) => s.weekday === weekdayOf(date));
  if (!schedule || !schedule.open || !Array.isArray(schedule.ranges)) return [];

  const now = parisNow();
  const minStart = date === now.date ? now.minutes + LEAD_TIME_MIN : 0;
  if (date < now.date) return [];

  const busy = bookings
    // Une demande en attente bloque déjà le créneau (comme un rdv confirmé).
    .filter(
      (b) =>
        b.date === date &&
        (b.status === "confirmed" || b.status === "pending")
    )
    .map((b) => {
      const start = toMinutes(String(b.start_time).slice(0, 5));
      return [start, start + b.duration_min] as const;
    });

  const slots: string[] = [];
  for (const range of schedule.ranges) {
    const open = toMinutes(range[0]);
    const close = toMinutes(range[1]);
    for (let start = open; start + durationMin <= close; start += SLOT_STEP_MIN) {
      if (start < minStart) continue;
      const end = start + durationMin;
      const overlaps = busy.some(([bs, be]) => start < be && end > bs);
      if (!overlaps) slots.push(toTime(start));
    }
  }
  return slots;
}

export type DayAvailability = {
  date: string;
  status: "closed" | "full" | "open";
  slots: number;
};

export function availableDays(input: SlotInput): DayAvailability[] {
  const now = parisNow();
  const days: DayAvailability[] = [];
  for (let i = 0; i < BOOKING_HORIZON_DAYS; i++) {
    const date = addDays(now.date, i);
    const schedule = input.schedules.find((s) => s.weekday === weekdayOf(date));
    const isBlocked = input.blocked.some(
      (b) => date >= b.start_date && date <= b.end_date
    );
    if (!schedule || !schedule.open || isBlocked) {
      days.push({ date, status: "closed", slots: 0 });
      continue;
    }
    const slots = slotsForDate(date, input);
    days.push({
      date,
      status: slots.length === 0 ? "full" : "open",
      slots: slots.length,
    });
  }
  return days;
}
