import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePage } from "@/lib/active-project";
import type { Booking, OfferKind, Order, OrderItem, ProductKind } from "@/lib/types";
import { CommandesLedger } from "./commandes-ledger";

export const metadata = { title: "Mes commandes" };

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

  const page = await getActivePage(supabase, user.id);

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
    />
  );
}
