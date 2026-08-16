import { createAdminClient } from "@/lib/supabase/admin";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n/config";
import type { Schedule, Service } from "@/lib/types";

// Charge les données nécessaires au calcul de créneaux, une fois la page
// (vitrine publiée par slug, ou tenant déjà résolu par page_id) connue.
async function loadContextForPageRow(
  page: { id: string; slug: string; business_name: string; published: boolean; user_id: string },
  serviceId: string
) {
  const supabase = createAdminClient();

  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .eq("page_id", page.id)
    .single<Service>();
  if (!service) return null;

  // Langue du professionnel : la notification créée à la réservation alimente
  // le push (title/body sont envoyés tels quels par le cron push-deliveries),
  // elle doit donc être écrite dans SA langue, pas dans celle du visiteur.
  const { data: owner } = await supabase
    .from("profiles")
    .select("locale")
    .eq("user_id", page.user_id)
    .maybeSingle<{ locale: string | null }>();
  const ownerLocale: Locale =
    owner?.locale && hasLocale(owner.locale) ? owner.locale : defaultLocale;

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
        // Une demande en attente réserve déjà le créneau (pas de double-booking
        // pendant que la commerçante décide).
        .in("status", ["pending", "confirmed"])
        .gte("date", new Date().toISOString().slice(0, 10)),
    ]);

  return {
    supabase,
    page,
    service,
    ownerLocale,
    schedules: (schedules ?? []) as Schedule[],
    blocked: blocked ?? [],
    bookings: bookings ?? [],
  };
}

export type BookingContext = NonNullable<
  Awaited<ReturnType<typeof loadContextForPageRow>>
>;

// Vitrine publique (booking widget) : résolution par slug, page doit être publiée.
export async function loadBookingContext(slug: string, serviceId: string) {
  const supabase = createAdminClient();
  const { data: page } = await supabase
    .from("pages")
    .select("id, slug, business_name, published, user_id")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (!page) return null;
  return loadContextForPageRow(page, serviceId);
}

// Tenant déjà résolu (ex: FLUX Voice, qui identifie la page via le numéro
// appelé) : pas de contrainte de publication, page_id fait foi.
export async function loadBookingContextForPage(pageId: string, serviceId: string) {
  const supabase = createAdminClient();
  const { data: page } = await supabase
    .from("pages")
    .select("id, slug, business_name, published, user_id")
    .eq("id", pageId)
    .single();
  if (!page) return null;
  return loadContextForPageRow(page, serviceId);
}
