import { createAdminClient } from "@/lib/supabase/admin";
import type { Schedule, Service } from "@/lib/types";

// Charge les données nécessaires au calcul de créneaux pour une vitrine publiée.
export async function loadBookingContext(slug: string, serviceId: string) {
  const supabase = createAdminClient();

  const { data: page } = await supabase
    .from("pages")
    .select("id, slug, business_name, published, user_id")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (!page) return null;

  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .eq("page_id", page.id)
    .single<Service>();
  if (!service) return null;

  const [{ data: schedules }, { data: blocked }, { data: bookings }] =
    await Promise.all([
      supabase.from("schedules").select("*").eq("page_id", page.id),
      supabase
        .from("blocked_periods")
        .select("start_date, end_date")
        .eq("page_id", page.id),
      supabase
        .from("bookings")
        .select("date, start_time, duration_min, status")
        .eq("page_id", page.id)
        .eq("status", "confirmed")
        .gte("date", new Date().toISOString().slice(0, 10)),
    ]);

  return {
    supabase,
    page,
    service,
    schedules: (schedules ?? []) as Schedule[],
    blocked: blocked ?? [],
    bookings: bookings ?? [],
  };
}
