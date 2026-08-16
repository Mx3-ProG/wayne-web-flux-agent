import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePage } from "@/lib/active-project";
import type {
  BlockedPeriod,
  Booking,
  Customer,
  Order,
  Schedule,
} from "@/lib/types";
import { AgendaView } from "@/components/agenda/agenda-view";
import { AgendaTunnel } from "@/components/agenda/agenda-tunnel";
import { InactiveCustomersCard } from "@/components/agenda/inactive-customers-card";
import { findInactiveCustomers } from "@/lib/integrations/automations/inactive-customers";
import { Button } from "@/components/ui/button";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "agenda")).meta.title };
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [page, locale] = await Promise.all([
    getActivePage(supabase, user.id),
    getAccountLocale(supabase, user.id),
  ]);
  const t = await getDictionary(locale, "agenda");

  if (!page) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <h1 className="text-2xl font-bold">{t.empty.title}</h1>
        <p className="text-muted-foreground">{t.empty.text}</p>
        <Button asChild>
          <Link href="/ma-page">{t.empty.cta}</Link>
        </Button>
      </div>
    );
  }

  const params = await searchParams;
  const showAgenda = params.view === "agenda";

  if (!showAgenda) {
    const { data: schedules } = await supabase
      .from("schedules")
      .select("*")
      .eq("page_id", page.id);

    return <AgendaTunnel schedules={(schedules ?? []) as Schedule[]} t={t} />;
  }

  const [
    { data: bookings },
    { data: customers },
    { data: orders },
    { data: schedules },
    { data: blocked },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("*")
      .eq("page_id", page.id)
      .order("date")
      .order("start_time"),
    supabase
      .from("customers")
      .select("*")
      .eq("page_id", page.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("*")
      .eq("page_id", page.id)
      .in("status", ["accepted", "fulfilled"])
      .order("created_at", { ascending: false }),
    supabase.from("schedules").select("*").eq("page_id", page.id),
    supabase.from("blocked_periods").select("*").eq("page_id", page.id),
    supabase.from("profiles").select("name").eq("user_id", user.id).single(),
  ]);

  const inactiveCustomers = findInactiveCustomers(
    (customers ?? []) as Customer[],
    (bookings ?? []) as Booking[]
  );

  return (
    <>
      <AgendaView
        page={page}
        ownerName={profile?.name ?? ""}
        icalUrl={`${process.env.NEXT_PUBLIC_SITE_URL}/api/ical/${page.ical_token}`}
        bookings={(bookings ?? []) as Booking[]}
        customers={(customers ?? []) as Customer[]}
        orders={(orders ?? []) as Order[]}
        schedules={(schedules ?? []) as Schedule[]}
        blocked={(blocked ?? []) as BlockedPeriod[]}
        locale={locale}
        t={t}
      />
      <div className="mx-auto max-w-2xl px-4 pb-8">
        <InactiveCustomersCard customers={inactiveCustomers} />
      </div>
    </>
  );
}
