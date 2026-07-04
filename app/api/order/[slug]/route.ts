import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { formatPrice } from "@/lib/types";

const PHONE_RE = /^[+0-9 ().-]{6,20}$/;

type IncomingItem = { product_id: string; quantity: number };

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

  // Agrège les quantités par produit (ignore les entrées invalides).
  const wanted = new Map<string, number>();
  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue;
    const { product_id, quantity } = raw as IncomingItem;
    const id = String(product_id ?? "");
    const qty = Math.floor(Number(quantity));
    if (!id || !Number.isFinite(qty) || qty <= 0) continue;
    wanted.set(id, Math.min(999, (wanted.get(id) ?? 0) + qty));
  }
  if (wanted.size === 0) {
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

  // Ne jamais faire confiance aux prix du client : on recharge les produits
  // actifs de cette page et on recalcule tout côté serveur.
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price_cents, active, page_id, track_stock, stock")
    .eq("page_id", page.id)
    .eq("active", true)
    .in("id", [...wanted.keys()]);

  // Écarte les produits épuisés (stock suivi à 0) : on ne prend pas de commande
  // qu'on ne pourra pas honorer.
  const found = (products ?? []).filter((p) => !(p.track_stock && p.stock <= 0));
  if (found.length === 0) {
    return NextResponse.json({ error: "invalid_items" }, { status: 400 });
  }

  let total = 0;
  const items = found.map((p) => {
    // Plafonne la quantité au stock disponible si le stock est suivi.
    const requested = wanted.get(p.id) ?? 1;
    const quantity = p.track_stock ? Math.min(requested, p.stock) : requested;
    const lineTotal = p.price_cents * quantity;
    total += lineTotal;
    return {
      product_id: p.id,
      name: p.name,
      unit_price_cents: p.price_cents,
      quantity,
      line_total_cents: lineTotal,
    };
  });

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
