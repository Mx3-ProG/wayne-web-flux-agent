import { createPublicClient } from "@/lib/supabase/public";

export type CartItem =
  | { product_id: string; quantity: number; offer_id?: never }
  | { offer_id: string; quantity: number; product_id?: never };

export async function submitGuestOrder(params: {
  pageId: string;
  firstName: string;
  phone: string;
  email?: string;
  address?: string;
  note?: string;
  items: CartItem[];
}): Promise<{ order_id: string; total_cents: number }> {
  const { pageId, firstName, phone, email, address, note, items } = params;
  const supabase = createPublicClient();

  const { data, error } = await supabase.rpc("create_guest_order", {
    p_page_id: pageId,
    p_first_name: firstName,
    p_phone: phone,
    p_email: email ?? null,
    p_address: address ?? null,
    p_note: note ?? "",
    p_items: items,
  });

  if (error) throw new Error(error.message);

  const order = Array.isArray(data) ? data[0] : data;
  if (!order?.order_id || typeof order.total_cents !== "number") {
    throw new Error("invalid_rpc_response");
  }

  return order as { order_id: string; total_cents: number };
}
