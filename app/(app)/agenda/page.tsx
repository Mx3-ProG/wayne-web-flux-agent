import Link from "next/link";
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
import { Button } from "@/components/ui/button";

export const metadata = { title: "Mon agenda" };

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

  const page = await getActivePage(supabase, user.id);

  if (!page) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <h1 className="text-2xl font-bold">D&apos;abord, ta vitrine</h1>
        <p className="text-muted-foreground">
          Ton agenda s&apos;active dès que ta page existe : tes clients y
          réservent directement.
        </p>
        <Button asChild>
          <Link href="/ma-page">Créer ma vitrine</Link>
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

    return <AgendaTunnel schedules={(schedules ?? []) as Schedule[]} />;
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

  return (
    <AgendaView
      page={page}
      ownerName={profile?.name ?? ""}
      icalUrl={`${process.env.NEXT_PUBLIC_SITE_URL}/api/ical/${page.ical_token}`}
      bookings={(bookings ?? []) as Booking[]}
      customers={(customers ?? []) as Customer[]}
      orders={(orders ?? []) as Order[]}
      schedules={(schedules ?? []) as Schedule[]}
      blocked={(blocked ?? []) as BlockedPeriod[]}
    />
  );
}
