import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderCreatedEmails } from "@/lib/emails/order-emails";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { formatPrice } from "@/lib/types";
import { enforceKarlMada } from "@/lib/karlmada";
import { defaultLocale, hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

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
  if (!await rateLimit(`order:${clientIp(request)}`, 5, 60_000)) {
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
  const address = String(body.address ?? "").trim().slice(0, 240) || null;
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

  const pageLookup = supabase
    .from("pages")
    .select("id, user_id, published")
    .eq("published", true);
  const isPageId = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(slug);
  const { data: page, error: pageError } = await (isPageId
    ? pageLookup.eq("id", slug)
    : pageLookup.eq("slug", slug)
  ).single();
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

  // On ne modère QUE les champs saisis par le client (sans userId : un client
  // ne peut jamais faire suspendre le marchand). Le catalogue du marchand est
  // déjà modéré à la création (actions produits/offres) et à la publication :
  // le re-scanner ici cumulerait des blocages contre le marchand à chaque
  // commande — retiré volontairement.
  const customerModeration = await enforceKarlMada(
    { firstName, address, note },
    { surface: "order:customer-input" }
  );
  if (customerModeration.error) {
    return NextResponse.json({ error: "content_blocked", message: customerModeration.error }, { status: 422 });
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc("create_guest_order", {
    p_page_id: page.id,
    p_first_name: firstName,
    p_phone: phone,
    p_email: email,
    p_address: address,
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

  // Notification propriétaire (hook de rétention : badge dashboard + payload
  // push envoyé tel quel par le cron push-deliveries). Écrite dans la langue du
  // compte du marchand, et avec les libellés de l'email qu'il reçoit au même
  // moment : une seule formulation à maintenir. Le nombre d'articles est laissé
  // de côté — il imposerait des règles de pluriel dans 9 langues pour une
  // information que l'email détaille déjà.
  const { data: owner } = await supabase
    .from("profiles")
    .select("locale")
    .eq("user_id", page.user_id)
    .maybeSingle<{ locale: string | null }>();
  const ownerLocale =
    owner?.locale && hasLocale(owner.locale) ? owner.locale : defaultLocale;
  const ownerDict = await getDictionary(ownerLocale, "emails");
  await supabase.from("notifications").insert({
    user_id: page.user_id,
    page_id: page.id,
    type: "order",
    ref_id: orderId,
    title: ownerDict.order.sellerNewOrder.title,
    body: ownerDict.order.sellerNewOrder.preheader
      .replaceAll("{firstName}", firstName)
      .replaceAll("{total}", formatPrice(total)),
  });

  // Emails (acheteur + vendeur) AWAITés avant la réponse : les callbacks after()
  // ne sont pas honorés sur Vercel ici (waitUntil non tenu), l'email au vendeur
  // ne partait jamais. Le try/catch garantit qu'un échec d'envoi ne casse pas la
  // commande — la réponse 201 part quoi qu'il arrive.
  try {
    await sendOrderCreatedEmails({
      orderId,
      pageId: page.id,
      firstName,
      phone,
      buyerEmail: email,
      address,
      note,
      totalCents: total,
    });
  } catch (e) {
    console.error("order: email dispatch failed", e);
  }

  return NextResponse.json({ ok: true, order_id: orderId, total_cents: total }, { status: 201 });
}
