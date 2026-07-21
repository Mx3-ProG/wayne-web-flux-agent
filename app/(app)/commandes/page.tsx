import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActivePage } from "@/lib/active-project";
import type { Booking, OfferKind, Order, OrderItem, ProductKind } from "@/lib/types";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale } from "@/lib/i18n/config";
import { CommandesLedger } from "./commandes-ledger";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "orders")).meta.title };
}

type OrderItemWithCatalog = OrderItem & {
  products: { kind: ProductKind } | null;
  offers: { kind: OfferKind } | null;
};
type OrderWithItems = Order & { order_items: OrderItemWithCatalog[] };

export default async function CommandesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [page, locale] = await Promise.all([
    getActivePage(supabase, user.id),
    getAccountLocale(supabase, user.id),
  ]);
  const t = await getDictionary(locale, "orders");

  let orders: OrderWithItems[] = [];
  let bookings: Booking[] = [];
  if (page) {
    const [{ data }, { data: bookingData }] = await Promise.all([
      supabase
        .from("orders")
        .select("*, order_items(*, products(kind), offers(kind))")
        .eq("page_id", page.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("bookings")
        .select("*")
        .eq("page_id", page.id)
        .order("date", { ascending: false })
        .order("start_time", { ascending: false }),
    ]);
    orders = (data ?? []) as OrderWithItems[];
    bookings = (bookingData ?? []) as Booking[];
  }

  return (
    <CommandesLedger
      pageExists={Boolean(page)}
      orders={orders}
      bookings={bookings}
      locale={locale}
      t={t}
    />
  );
}
