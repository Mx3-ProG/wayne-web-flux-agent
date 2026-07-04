import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { formatPrice } from "@/lib/types";

const PHONE_RE = /^[+0-9 ().-]{6,20}$/;

// Item entrant : { kind: 'product'|'offer', id, quantity }. On tolère aussi
// l'ancien format { product_id, quantity }.
type IncomingItem = {
  kind?: string;
  id?: string;
  product_id?: string;
  quantity: number;
};

type RpcCartItem =
  | { product_id: string; quantity: number; offer_id?: never }
  | { offer_id: string; quantity: number; product_id?: never };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!rateLimit(`order:${clientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const firstName = String(body.first_name ?? "").trim().slice(0, 60);
  const phone = String(body.phone ?? "").trim();
  const email = String(body.email ?? "").trim().slice(0, 120) || null;
  const note = String(body.note ?? "").trim().slice(0, 500);
  const rawItems = Array.isArray(body.items) ? (body.items as unknown[]) : [];

  if (!firstName || !PHONE_RE.test(phone)) {
    return NextResponse.json({ error: "invalid_contact" }, { status: 400 });
  }

  // Agrège les quantités par produit et par offre (ignore les invalides).
  const wantedProducts = new Map<string, number>();
  const wantedOffers = new Map<string, number>();
  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as IncomingItem;
    const qty = Math.floor(Number(it.quantity));
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const isOffer = it.kind === "offer";
    const id = String((isOffer ? it.id : it.id ?? it.product_id) ?? "");
    if (!id) continue;
    const target = isOffer ? wantedOffers : wantedProducts;
    target.set(id, Math.min(999, (target.get(id) ?? 0) + qty));
  }
  if (wantedProducts.size === 0 && wantedOffers.size === 0) {
    return NextResponse.json({ error: "empty_order" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: page, error: pageError } = await supabase
    .from("pages")
    .select("id, user_id, published")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (pageError || !page) {
    console.error("order: page lookup failed", { slug, error: pageError });
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const rpcItems: RpcCartItem[] = [
    ...[...wantedProducts.entries()].map(([product_id, quantity]) => ({
      product_id,
      quantity,
    })),
    ...[...wantedOffers.entries()].map(([offer_id, quantity]) => ({
      offer_id,
      quantity,
    })),
  ];

  const { data: rpcData, error: rpcError } = await supabase.rpc("create_guest_order", {
    p_page_id: page.id,
    p_first_name: firstName,
    p_phone: phone,
    p_email: email,
    p_note: note,
    p_items: rpcItems,
  });
  if (rpcError) {
    console.error("order: create_guest_order failed", { slug, error: rpcError });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  const order = Array.isArray(rpcData) ? rpcData[0] : rpcData;
  const orderId = order?.order_id as string | undefined;
  const total = typeof order?.total_cents === "number" ? order.total_cents : 0;
  if (!orderId) {
    console.error("order: invalid create_guest_order response", { slug, rpcData });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  // Notification propriétaire (hook de rétention : badge dashboard).
  const count = rpcItems.reduce((n, it) => n + it.quantity, 0);
  await supabase.from("notifications").insert({
    user_id: page.user_id,
    page_id: page.id,
    type: "order",
    ref_id: orderId,
    title: "Nouvelle commande",
    body: `${firstName} · ${count} article${count > 1 ? "s" : ""} · ${formatPrice(total)}`,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
