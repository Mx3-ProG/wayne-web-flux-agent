import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActivePage } from "@/lib/active-project";
import type { Product, ProductCategory } from "@/lib/types";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale } from "@/lib/i18n/config";
import { ProductsManager } from "./products-manager";
import styles from "./produits.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "products")).meta.title };
}

export default async function ProduitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [page, locale] = await Promise.all([
    getActivePage(supabase, user.id),
    getAccountLocale(supabase, user.id),
  ]);
  const t = await getDictionary(locale, "products");

  if (!page) {
    return (
      <div className={styles.page}>
        <p className={styles.eyebrow}>{t.page.eyebrow}</p>
        <h1 className={styles.title}>{t.page.title}</h1>
        <div className={styles.empty}>
          {t.page.emptyStart} <Link href="/ma-page">{t.page.emptyLink}</Link>{" "}
          {t.page.emptyEnd}
        </div>
      </div>
    );
  }

  // La 1re catégorie du COMPTE est offerte : on compte sur tous les projets.
  const { data: userPages } = await supabase
    .from("pages")
    .select("id")
    .eq("user_id", user.id);
  const { count: accountCategories } = await supabase
    .from("product_categories")
    .select("id", { count: "exact", head: true })
    .in("page_id", (userPages ?? []).map((p) => p.id));

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
      <p className={styles.eyebrow}>{t.page.eyebrow}</p>
      <h1 className={styles.title}>{t.page.title}</h1>
      <p className={styles.subtitle}>{t.page.subtitle}</p>

      {products.length === 0 && categories.length === 0 && (
        <p className={styles.hint}>{t.page.startHint}</p>
      )}

      <ProductsManager
        initialCategories={categories}
        initialProducts={products}
        sales={sales}
        userId={user.id}
        firstCategoryFree={(accountCategories ?? 0) === 0}
        t={t}
      />
    </div>
  );
}
