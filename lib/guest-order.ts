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
  const response = await fetch(`/api/order/${encodeURIComponent(pageId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: firstName,
      phone,
      email: email ?? null,
      address: address ?? null,
      note: note ?? "",
      items: items.map((item) =>
        "offer_id" in item
          ? { kind: "offer", id: item.offer_id, quantity: item.quantity }
          : { kind: "product", id: item.product_id, quantity: item.quantity }
      ),
    }),
  });
  const data = (await response.json()) as { order_id?: string; total_cents?: number; error?: string };
  if (!response.ok) throw new Error(data.error ?? "order_failed");
  return { order_id: data.order_id ?? "created", total_cents: data.total_cents ?? 0 };
}
