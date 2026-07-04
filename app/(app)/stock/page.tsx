import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Page, Product, ProductCategory } from "@/lib/types";
import { formatPrice } from "@/lib/types";
import {
  decStock,
  incStock,
  restock,
  setStock,
  toggleTrackStock,
} from "./actions";
import styles from "./stock.module.css";

export const metadata = { title: "Mon stock" };

function ProductRow({ product }: { product: Product }) {
  const out = product.track_stock && product.stock <= 0;
  return (
    <div className={`${styles.row} ${out ? styles.rowOut : ""}`}>
      <div className={styles.info}>
        <p className={styles.name}>{product.name}</p>
        <p className={styles.price}>{formatPrice(product.price_cents)}</p>
      </div>

      {product.track_stock ? (
        <div className={styles.controls}>
          <div className={`${styles.stockValue} ${out ? styles.stockOut : ""}`}>
            {product.stock}
          </div>
          {out && <span className={styles.stockTag}>Rupture</span>}
          <form action={decStock.bind(null, product.id)}>
            <button type="submit" className={styles.step} aria-label="Retirer un">
              −
            </button>
          </form>
          <form action={incStock.bind(null, product.id)}>
            <button type="submit" className={styles.step} aria-label="Ajouter un">
              +
            </button>
          </form>
          <form action={setStock.bind(null, product.id)} className={styles.setForm}>
            <input
              name="qty"
              type="number"
              min={0}
              defaultValue={product.stock}
              className={styles.qtyInput}
              aria-label="Stock exact"
            />
            <button type="submit" className={styles.btn}>
              Définir
            </button>
          </form>
          <form action={restock.bind(null, product.id)} className={styles.setForm}>
            <input
              name="qty"
              type="number"
              min={1}
              placeholder="+ qté"
              className={styles.qtyInput}
              aria-label="Réapprovisionner"
            />
            <button type="submit" className={styles.btn}>
              Réappro
            </button>
          </form>
          <form action={toggleTrackStock.bind(null, product.id)}>
            <button type="submit" className={styles.btn} title="Arrêter le suivi">
              Ne plus suivre
            </button>
          </form>
        </div>
      ) : (
        <div className={styles.controls}>
          <span className={styles.muted}>Stock non suivi</span>
          <form action={toggleTrackStock.bind(null, product.id)}>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
              Suivre le stock
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default async function StockPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<Pick<Page, "id">>();

  let categories: ProductCategory[] = [];
  let products: Product[] = [];
  if (page) {
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase
        .from("product_categories")
        .select("*")
        .eq("page_id", page.id)
        .order("position"),
      supabase
        .from("products")
        .select("*")
        .eq("page_id", page.id)
        .order("position"),
    ]);
    categories = (cats ?? []) as ProductCategory[];
    products = (prods ?? []) as Product[];
  }

  const uncategorized = products.filter(
    (p) => !p.category_id || !categories.some((c) => c.id === p.category_id)
  );

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Ta boutique</p>
      <h1 className={styles.title}>Mon stock</h1>
      <p className={styles.subtitle}>
        Active le suivi produit par produit. Le stock baisse à chaque commande
        acceptée et l&apos;article passe en « épuisé » sur ta vitrine à zéro.
      </p>

      {!page && (
        <div className={styles.empty}>
          Crée d&apos;abord ta <Link href="/ma-page">vitrine</Link> et ajoute des
          produits.
        </div>
      )}

      {page && products.length === 0 && (
        <div className={styles.empty}>
          Aucun produit. Ajoute-en dans ta <Link href="/ma-page">boutique</Link>.
        </div>
      )}

      {categories.map((category) => {
        const catProducts = products.filter((p) => p.category_id === category.id);
        if (catProducts.length === 0) return null;
        return (
          <section key={category.id} className={styles.category}>
            <h2 className={styles.categoryName}>{category.name}</h2>
            {catProducts.map((p) => (
              <ProductRow key={p.id} product={p} />
            ))}
          </section>
        );
      })}

      {uncategorized.length > 0 && (
        <section className={styles.category}>
          <h2 className={styles.categoryName}>Autres produits</h2>
          {uncategorized.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </section>
      )}
    </div>
  );
}
