"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendOrderStatusEmail } from "@/lib/emails/order-emails";
import type { OrderStatus } from "@/lib/types";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

// Applique les mouvements de stock d'une commande (négatif à l'acceptation,
// positif à l'annulation). Seulement pour les produits dont le stock est suivi.
async function applyOrderStock(
  supabase: SupabaseServer,
  orderId: string,
  direction: "sale" | "cancel"
) {
  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);
  const withProduct = (items ?? []).filter((it) => it.product_id);
  if (withProduct.length === 0) return;

  const { data: products } = await supabase
    .from("products")
    .select("id, track_stock")
    .in(
      "id",
      withProduct.map((it) => it.product_id as string)
    );
  const tracked = new Set(
    (products ?? []).filter((p) => p.track_stock).map((p) => p.id)
  );

  for (const item of withProduct) {
    if (!tracked.has(item.product_id as string)) continue;
    const delta = direction === "sale" ? -item.quantity : item.quantity;
    await supabase.rpc("apply_stock_movement", {
      p_product: item.product_id,
      p_delta: delta,
      p_reason: direction,
      p_order: orderId,
    });
  }
}

// Change le statut d'une commande. La RLS "own orders" garantit que seul le
// propriétaire de la page peut la modifier.
async function setOrderStatus(
  orderId: string,
  status: OrderStatus,
  extra: Record<string, unknown> = {}
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };

  const { error } = await supabase
    .from("orders")
    .update({ status, ...extra })
    .eq("id", orderId);
  if (error) return { error: "Action impossible." };

  revalidatePath("/commandes");
  revalidatePath("/stock");
  revalidatePath("/espace"); // compteur de CA (Phase 3)
  return {};
}

// Décrémente le stock uniquement au passage pending → accepted.
export async function acceptOrder(orderId: string): Promise<void> {
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();
  const { error } = await setOrderStatus(orderId, "accepted", {
    accepted_at: new Date().toISOString(),
  });
  if (!error) {
    after(() =>
      sendOrderStatusEmail(orderId, "accepted").catch((e) =>
        console.error("order: status email failed", e)
      )
    );
  }
  if (order?.status === "pending") {
    await applyOrderStock(supabase, orderId, "sale");
    revalidatePath("/commandes");
    revalidatePath("/stock");
  }
}

export async function fulfillOrder(orderId: string): Promise<void> {
  const { error } = await setOrderStatus(orderId, "fulfilled");
  if (!error) {
    after(() =>
      sendOrderStatusEmail(orderId, "ready").catch((e) =>
        console.error("order: status email failed", e)
      )
    );
  }
}

// Restaure le stock si la commande avait déjà été acceptée (stock décrémenté).
export async function cancelOrder(orderId: string): Promise<void> {
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();
  const wasDecremented = order?.status === "accepted" || order?.status === "fulfilled";
  const { error } = await setOrderStatus(orderId, "cancelled");
  if (!error) {
    after(() =>
      sendOrderStatusEmail(orderId, "cancelled").catch((e) =>
        console.error("order: status email failed", e)
      )
    );
  }
  if (wasDecremented) {
    await applyOrderStock(supabase, orderId, "cancel");
    revalidatePath("/commandes");
    revalidatePath("/stock");
  }
}
