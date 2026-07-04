"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type StockReason = "restock" | "adjustment" | "cancel";

async function move(productId: string, delta: number, reason: StockReason) {
  if (delta === 0) return;
  const supabase = await createClient();
  // apply_stock_movement vérifie la propriété via auth.uid() et écrit le
  // mouvement + le nouveau stock de façon atomique.
  await supabase.rpc("apply_stock_movement", {
    p_product: productId,
    p_delta: delta,
    p_reason: reason,
    p_order: null,
  });
  revalidatePath("/stock");
  revalidatePath("/ma-page");
}

// Active/désactive le suivi de stock d'un produit (RLS "own products").
export async function toggleTrackStock(productId: string): Promise<void> {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("track_stock")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return;
  await supabase
    .from("products")
    .update({ track_stock: !product.track_stock })
    .eq("id", productId);
  revalidatePath("/stock");
  revalidatePath("/ma-page");
}

export async function incStock(productId: string): Promise<void> {
  await move(productId, 1, "restock");
}

export async function decStock(productId: string): Promise<void> {
  await move(productId, -1, "adjustment");
}

// Réappro rapide : ajoute une quantité (champ « qty » du formulaire).
export async function restock(productId: string, formData: FormData): Promise<void> {
  const amount = Math.max(0, Math.round(Number(formData.get("qty")) || 0));
  await move(productId, amount, "restock");
}

// Définit le stock exact (calcule l'écart vs le stock actuel).
export async function setStock(productId: string, formData: FormData): Promise<void> {
  const target = Math.max(0, Math.round(Number(formData.get("qty")) || 0));
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("stock")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return;
  await move(productId, target - product.stock, "adjustment");
}
