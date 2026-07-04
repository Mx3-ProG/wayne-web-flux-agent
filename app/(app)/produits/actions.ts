"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";

type TunnelProduct = {
  name: string;
  description: string;
  price_cents: number;
  image_url: string | null;
  track_stock: boolean;
  stock: number;
  active: boolean;
};

// Versions à paramètres numériques (plus pratiques à appeler côté client que
// les variantes FormData). apply_stock_movement vérifie la propriété + le verrou.
export async function addStock(productId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const supabase = await createClient();
  await supabase.rpc("apply_stock_movement", {
    p_product: productId,
    p_delta: Math.round(amount),
    p_reason: "restock",
    p_order: null,
  });
  revalidateAll();
}

export async function setStockExact(productId: string, target: number): Promise<void> {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("stock")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return;
  const delta = Math.max(0, Math.round(target)) - product.stock;
  if (delta === 0) return;
  await supabase.rpc("apply_stock_movement", {
    p_product: productId,
    p_delta: delta,
    p_reason: "adjustment",
    p_order: null,
  });
  revalidateAll();
}

async function ownedPageId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  // Le projet actif du user (multi-boutiques).
  return getActivePageId(supabase, user.id);
}

function revalidateAll() {
  revalidatePath("/produits");
  revalidatePath("/ma-page");
  revalidatePath("/projets");
}

export async function createCategory(): Promise<{ error?: string; id?: string; pageId?: string }> {
  const supabase = await createClient();
  const pageId = await ownedPageId();
  if (!pageId) return { error: "Crée d'abord ta vitrine." };
  const { count } = await supabase
    .from("product_categories")
    .select("id", { count: "exact", head: true })
    .eq("page_id", pageId);
  const { data, error } = await supabase
    .from("product_categories")
    .insert({ page_id: pageId, name: "Nouvelle catégorie", position: count ?? 0 })
    .select("id")
    .single();
  if (error || !data) return { error: "Création impossible." };
  revalidateAll();
  return { id: data.id, pageId };
}

export async function updateCategory(
  categoryId: string,
  name: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_categories")
    .update({ name: name.trim().slice(0, 60) })
    .eq("id", categoryId);
  if (error) return { error: "Enregistrement impossible." };
  revalidateAll();
  return {};
}

export async function deleteCategory(categoryId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  // Les produits de la catégorie passent en "non catégorisé" (category_id null).
  const { error } = await supabase
    .from("product_categories")
    .delete()
    .eq("id", categoryId);
  if (error) return { error: "Suppression impossible." };
  revalidateAll();
  return {};
}

export async function createProduct(
  categoryId: string | null
): Promise<{ error?: string; id?: string; pageId?: string }> {
  const supabase = await createClient();
  const pageId = await ownedPageId();
  if (!pageId) return { error: "Crée d'abord ta vitrine." };
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("page_id", pageId);
  const { data, error } = await supabase
    .from("products")
    .insert({
      page_id: pageId,
      category_id: categoryId,
      name: "Nouveau produit",
      price_cents: 0,
      position: count ?? 0,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Création impossible." };
  revalidateAll();
  return { id: data.id, pageId };
}

export async function createProductsFromTunnel(
  categoryName: string,
  products: TunnelProduct[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const pageId = await ownedPageId();
  if (!pageId) return { error: "Crée d'abord ta vitrine." };

  const cleanCategory = categoryName.trim().slice(0, 60);
  const cleanProducts = products
    .map((product) => ({
      name: product.name.trim().slice(0, 80),
      description: product.description.trim().slice(0, 400),
      price_cents: Math.max(0, Math.round(product.price_cents)),
      image_url: product.image_url,
      track_stock: Boolean(product.track_stock),
      stock:
        product.track_stock && Number.isFinite(product.stock)
          ? Math.max(0, Math.floor(product.stock))
          : 0,
      active: Boolean(product.active),
    }))
    .filter((product) => product.name)
    .slice(0, 8);

  if (!cleanCategory) return { error: "Donne un nom à ta catégorie." };
  if (cleanProducts.length === 0) return { error: "Ajoute au moins un produit." };

  const [{ count: categoryCount }, { count: productCount }] = await Promise.all([
    supabase
      .from("product_categories")
      .select("id", { count: "exact", head: true })
      .eq("page_id", pageId),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("page_id", pageId),
  ]);

  const { data: category, error: categoryError } = await supabase
    .from("product_categories")
    .insert({
      page_id: pageId,
      name: cleanCategory,
      position: categoryCount ?? 0,
    })
    .select("id")
    .single();
  if (categoryError || !category) return { error: "Création de la catégorie impossible." };

  const { error: productsError } = await supabase.from("products").insert(
    cleanProducts.map((product, index) => ({
      ...product,
      page_id: pageId,
      category_id: category.id,
      position: (productCount ?? 0) + index,
    }))
  );

  if (productsError) {
    await supabase.from("product_categories").delete().eq("id", category.id);
    return { error: "Création des produits impossible." };
  }

  revalidateAll();
  return {};
}

type ProductFields = {
  name: string;
  description: string;
  price_cents: number;
  image_url: string | null;
  active: boolean;
  category_id: string | null;
};

export async function updateProduct(
  productId: string,
  fields: Partial<ProductFields>
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("products").update(fields).eq("id", productId);
  if (error) return { error: "Enregistrement impossible." };
  revalidateAll();
  return {};
}

export async function deleteProduct(productId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { error: "Suppression impossible." };
  revalidateAll();
  return {};
}
