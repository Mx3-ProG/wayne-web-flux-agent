"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import type { TimeRange } from "@/lib/types";

async function ownedPageId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  // Le projet actif du user (multi-boutiques).
  return getActivePageId(supabase, user.id);
}

export type DaySetting = {
  weekday: number;
  open: boolean;
  ranges: TimeRange[];
};

const TIME_RE = /^\d{2}:\d{2}$/;

export async function saveSchedules(
  days: DaySetting[]
): Promise<{ error?: string }> {
  const pageId = await ownedPageId();
  if (!pageId) return { error: "not_authenticated" };
  const supabase = await createClient();

  for (const day of days) {
    if (day.weekday < 0 || day.weekday > 6) continue;
    const ranges = (day.ranges ?? [])
      .filter((r) => TIME_RE.test(r[0]) && TIME_RE.test(r[1]) && r[0] < r[1])
      .slice(0, 3);
    const { error } = await supabase.from("schedules").upsert(
      {
        page_id: pageId,
        weekday: day.weekday,
        open: day.open && ranges.length > 0,
        ranges,
      },
      { onConflict: "page_id,weekday" }
    );
    if (error) return { error: "save_failed" };
  }
  revalidatePath("/agenda");
  return {};
}

export async function addBlockedPeriod(
  startDate: string,
  endDate: string
): Promise<{ error?: string }> {
  const pageId = await ownedPageId();
  if (!pageId) return { error: "not_authenticated" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
    return { error: "invalid_dates" };
  if (endDate < startDate) return { error: "end_before_start" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("blocked_periods")
    .insert({ page_id: pageId, start_date: startDate, end_date: endDate });
  if (error) return { error: "block_failed" };
  revalidatePath("/agenda");
  return {};
}

export async function removeBlockedPeriod(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  await supabase.from("blocked_periods").delete().eq("id", id); // RLS protège
  revalidatePath("/agenda");
  return {};
}

export async function saveCustomerNote(
  customerId: string,
  note: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ note: note.slice(0, 1000) })
    .eq("id", customerId); // RLS protège
  if (error) return { error: "note_save_failed" };
  revalidatePath("/agenda");
  return {};
}

export async function cancelBooking(bookingId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId); // RLS protège
  if (error) return { error: "cancel_failed" };
  revalidatePath("/agenda");
  return {};
}

// Validation obligatoire : accepter une demande en attente (pending → confirmed).
// On ne bascule que depuis 'pending' pour ne pas « ressusciter » un rdv annulé.
export async function acceptBooking(bookingId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId)
    .eq("status", "pending"); // RLS protège
  if (error) return { error: "accept_failed" };
  revalidatePath("/agenda");
  return {};
}

// Refuser une demande en attente (pending → refused). Le créneau est libéré.
export async function refuseBooking(bookingId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status: "refused" })
    .eq("id", bookingId)
    .eq("status", "pending"); // RLS protège
  if (error) return { error: "refuse_failed" };
  revalidatePath("/agenda");
  return {};
}
