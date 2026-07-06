"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import type { ProductKind } from "@/lib/types";

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

async function revalidatePublicPage(pageId: string | null | undefined) {
  if (!pageId) return;
  const supabase = await createClient();
  const { data: page } = await supabase
    .from("pages")
    .select("slug")
    .eq("id", pageId)
    .maybeSingle();
  if (page?.slug) revalidatePath(`/p/${page.slug}`);
}

async function syncReservationService(productId: string) {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, page_id, category_id, kind, name, price_cents, duration_min, active")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return;

  if (product.kind !== "reservation" || !product.active) {
    await supabase.from("services").delete().eq("product_id", product.id);
    return;
  }

  const categoryId = product.category_id as string | null;
  const { data: category } = categoryId
    ? await supabase
        .from("product_categories")
        .select("id, name, position")
        .eq("id", categoryId)
        .maybeSingle()
    : { data: null };

  let familyId: string | null = null;
  if (category?.id) {
    const { data: existingFamily } = await supabase
      .from("service_families")
      .select("id")
      .eq("product_category_id", category.id)
      .maybeSingle();
    if (existingFamily?.id) {
      familyId = existingFamily.id;
      await supabase
        .from("service_families")
        .update({
          name: category.name,
          page_id: product.page_id,
          position: category.position ?? 0,
        })
        .eq("id", familyId);
    } else {
      const { data: insertedFamily } = await supabase
        .from("service_families")
        .insert({
          page_id: product.page_id,
          product_category_id: category.id,
          name: category.name,
          position: category.position ?? 0,
        })
        .select("id")
        .single();
      familyId = insertedFamily?.id ?? null;
    }
  } else {
    const { data: existingFamily } = await supabase
      .from("service_families")
      .select("id")
      .eq("page_id", product.page_id)
      .is("product_category_id", null)
      .eq("name", "Réservations")
      .maybeSingle();
    if (existingFamily?.id) {
      familyId = existingFamily.id;
    } else {
      const { data: insertedFamily } = await supabase
        .from("service_families")
        .insert({
          page_id: product.page_id,
          name: "Réservations",
          position: 999,
        })
        .select("id")
        .single();
      familyId = insertedFamily?.id ?? null;
    }
  }
  if (!familyId) return;

  const fields = {
    family_id: familyId,
    page_id: product.page_id,
    product_id: product.id,
    name: product.name,
    duration_min: Math.min(600, Math.max(5, product.duration_min || 60)),
    price_cents: Math.max(0, Math.round(product.price_cents || 0)),
    position: 0,
  };
  const { data: existingService } = await supabase
    .from("services")
    .select("id")
    .eq("product_id", product.id)
    .maybeSingle();
  if (existingService?.id) {
    await supabase.from("services").update(fields).eq("id", existingService.id);
  } else {
    await supabase.from("services").insert(fields);
  }
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
  await revalidatePublicPage(pageId);
  revalidateAll();
  return { id: data.id, pageId };
}

export async function updateCategory(
  categoryId: string,
  name: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("product_categories")
    .select("page_id, name")
    .eq("id", categoryId)
    .maybeSingle();
  if (!current) return { error: "Catégorie introuvable." };

  const nextName = name.trim().slice(0, 60);
  const { error } = await supabase
    .from("product_categories")
    .update({ name: nextName })
    .eq("id", categoryId);
  if (error) return { error: "Enregistrement impossible." };
  await supabase
    .from("service_families")
    .update({ name: nextName })
    .eq("page_id", current.page_id)
    .eq("name", current.name);
  await supabase
    .from("service_families")
    .update({ name: nextName })
    .eq("product_category_id", categoryId);
  await revalidatePublicPage(current.page_id);
  revalidateAll();
  return {};
}

export async function deleteCategory(categoryId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("product_categories")
    .select("page_id, name")
    .eq("id", categoryId)
    .maybeSingle();
  const { data: movedProducts } = await supabase
    .from("products")
    .select("id")
    .eq("category_id", categoryId)
    .eq("kind", "reservation");
  // Les produits de la catégorie passent en "non catégorisé" (category_id null).
  const { error } = await supabase
    .from("product_categories")
    .delete()
    .eq("id", categoryId);
  if (error) return { error: "Suppression impossible." };
  if (current) {
    await supabase
      .from("service_families")
      .delete()
      .eq("page_id", current.page_id)
      .eq("name", current.name);
  }
  for (const product of movedProducts ?? []) {
    await syncReservationService(product.id);
  }
  await revalidatePublicPage(current?.page_id);
  revalidateAll();
  return {};
}

export async function createProduct(
  categoryId: string | null,
  kind: ProductKind = "product"
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
      kind,
      name: kind === "reservation" ? "Nouvelle réservation" : "Nouveau produit",
      price_cents: 0,
      duration_min: 60,
      position: count ?? 0,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Création impossible." };
  if (kind === "reservation") await syncReservationService(data.id);
  await revalidatePublicPage(pageId);
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

  await revalidatePublicPage(pageId);
  revalidateAll();
  return {};
}

type ProductFields = {
  kind: ProductKind;
  name: string;
  description: string;
  price_cents: number;
  duration_min: number;
  image_url: string | null;
  active: boolean;
  category_id: string | null;
};

export async function updateProduct(
  productId: string,
  fields: Partial<ProductFields>
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("products")
    .select("page_id, name, price_cents")
    .eq("id", productId)
    .maybeSingle();
  if (!current) return { error: "Produit introuvable." };

  const { error } = await supabase.from("products").update(fields).eq("id", productId);
  if (error) return { error: "Enregistrement impossible." };
  const serviceFields: Partial<Pick<ProductFields, "name" | "price_cents" | "duration_min">> = {};
  if (fields.name !== undefined) serviceFields.name = fields.name.trim().slice(0, 80);
  if (fields.price_cents !== undefined) {
    serviceFields.price_cents = Math.max(0, Math.round(fields.price_cents || 0));
  }
  if (fields.duration_min !== undefined) {
    serviceFields.duration_min = Math.min(600, Math.max(5, fields.duration_min || 60));
  }
  if (Object.keys(serviceFields).length > 0) {
    await supabase
      .from("services")
      .update(serviceFields)
      .eq("page_id", current.page_id)
      .eq("name", current.name)
      .eq("price_cents", current.price_cents);
  }
  await syncReservationService(productId);
  await revalidatePublicPage(current.page_id);
  revalidateAll();
  return {};
}

export async function deleteProduct(productId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("products")
    .select("page_id, name, price_cents")
    .eq("id", productId)
    .maybeSingle();
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { error: "Suppression impossible." };
  if (current) {
    await supabase
      .from("services")
      .delete()
      .eq("page_id", current.page_id)
      .eq("name", current.name)
      .eq("price_cents", current.price_cents);
  }
  await revalidatePublicPage(current?.page_id);
  revalidateAll();
  return {};
}
