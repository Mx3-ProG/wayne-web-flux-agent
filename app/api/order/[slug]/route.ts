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

  const { data: page } = await supabase
    .from("pages")
    .select("id, user_id, published")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (!page) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Ne jamais faire confiance aux prix du client : on recharge produits ET
  // offres actifs de cette page et on recalcule tout côté serveur.
  const [{ data: products }, { data: offers }] = await Promise.all([
    wantedProducts.size > 0
      ? supabase
          .from("products")
          .select("id, name, price_cents, active, page_id, track_stock, stock")
          .eq("page_id", page.id)
          .eq("active", true)
          .in("id", [...wantedProducts.keys()])
      : Promise.resolve({ data: [] as never[] }),
    wantedOffers.size > 0
      ? supabase
          .from("offers")
          .select("id, title, price_cents, active, page_id")
          .eq("page_id", page.id)
          .eq("active", true)
          .in("id", [...wantedOffers.keys()])
      : Promise.resolve({ data: [] as never[] }),
  ]);

  let total = 0;
  const items: {
    product_id: string | null;
    offer_id: string | null;
    name: string;
    unit_price_cents: number;
    quantity: number;
    line_total_cents: number;
  }[] = [];

  // Produits : écarte les épuisés, plafonne au stock suivi.
  for (const p of (products ?? []).filter((p) => !(p.track_stock && p.stock <= 0))) {
    const requested = wantedProducts.get(p.id) ?? 1;
    const quantity = p.track_stock ? Math.min(requested, p.stock) : requested;
    if (quantity <= 0) continue;
    const lineTotal = p.price_cents * quantity;
    total += lineTotal;
    items.push({
      product_id: p.id,
      offer_id: null,
      name: p.name,
      unit_price_cents: p.price_cents,
      quantity,
      line_total_cents: lineTotal,
    });
  }

  // Offres : autonomes, pas de stock.
  for (const o of offers ?? []) {
    const quantity = wantedOffers.get(o.id) ?? 1;
    const lineTotal = o.price_cents * quantity;
    total += lineTotal;
    items.push({
      product_id: null,
      offer_id: o.id,
      name: o.title,
      unit_price_cents: o.price_cents,
      quantity,
      line_total_cents: lineTotal,
    });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "invalid_items" }, { status: 400 });
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      page_id: page.id,
      first_name: firstName,
      phone,
      email,
      note,
      total_cents: total,
    })
    .select("id")
    .single();
  if (orderError || !order) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(items.map((it) => ({ ...it, order_id: order.id })));
  if (itemsError) {
    // Rollback best-effort de la commande orpheline.
    await supabase.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  // CRM : le client est créé/mis à jour comme pour les réservations.
  await supabase
    .from("customers")
    .upsert(
      { page_id: page.id, phone, first_name: firstName, email },
      { onConflict: "page_id,phone" }
    );

  // Notification propriétaire (hook de rétention : badge dashboard).
  const count = items.reduce((n, it) => n + it.quantity, 0);
  await supabase.from("notifications").insert({
    user_id: page.user_id,
    page_id: page.id,
    type: "order",
    ref_id: order.id,
    title: "Nouvelle commande",
    body: `${firstName} · ${count} article${count > 1 ? "s" : ""} · ${formatPrice(total)}`,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
