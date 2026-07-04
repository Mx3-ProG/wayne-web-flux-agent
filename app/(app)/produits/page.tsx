import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePage } from "@/lib/active-project";
import type { Product, ProductCategory } from "@/lib/types";
import { ProductsManager } from "./products-manager";
import styles from "./produits.module.css";

export const metadata = { title: "Mes produits" };

export default async function ProduitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const page = await getActivePage(supabase, user.id);

  if (!page) {
    return (
      <div className={styles.page}>
        <p className={styles.eyebrow}>Ta boutique</p>
        <h1 className={styles.title}>Mes produits</h1>
        <div className={styles.empty}>
          Crée d&apos;abord ta <Link href="/ma-page">vitrine</Link> pour gérer tes
          produits.
        </div>
      </div>
    );
  }

  const [{ data: cats }, { data: prods }, { data: soldItems }] = await Promise.all([
    supabase
      .from("product_categories")
      .select("*")
      .eq("page_id", page.id)
      .order("position"),
    supabase.from("products").select("*").eq("page_id", page.id).order("position"),
    supabase
      .from("order_items")
      .select("product_id, quantity, line_total_cents, orders!inner(page_id, status)")
      .eq("orders.page_id", page.id)
      .in("orders.status", ["accepted", "fulfilled"])
      .not("product_id", "is", null),
  ]);

  const categories = ((cats ?? []) as ProductCategory[]).map((c) => ({
    id: c.id,
    name: c.name,
  }));
  const products = (prods ?? []) as Product[];

  // CA + quantités vendues par produit (commandes acceptées/honorées).
  const sales: Record<string, { count: number; cents: number }> = {};
  for (const item of (soldItems ?? []) as {
    product_id: string;
    quantity: number;
    line_total_cents: number;
  }[]) {
    const s = (sales[item.product_id] ??= { count: 0, cents: 0 });
    s.count += item.quantity;
    s.cents += item.line_total_cents;
  }

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Ta boutique</p>
      <h1 className={styles.title}>Mes produits</h1>
      <p className={styles.subtitle}>
        Ton catalogue e-commerce : crée tes produits, suis ton stock (une commande
        acceptée = −1) et vois ce que chacun te rapporte. Ils s&apos;affichent dans
        « Mes prestations » sur ta vitrine.
      </p>

      {products.length === 0 && categories.length === 0 && (
        <p className={styles.hint}>
          Commence par ajouter une catégorie, puis des produits dedans.
        </p>
      )}

      <ProductsManager
        initialCategories={categories}
        initialProducts={products}
        sales={sales}
        userId={user.id}
      />
    </div>
  );
}
