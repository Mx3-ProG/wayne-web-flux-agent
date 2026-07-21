"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { Product, ProductKind } from "@/lib/types";
import { formatPrice } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import {
  CATEGORY_CREATE_COST,
  PRODUCT_ADD_COST,
  RESERVATION_ADD_COST,
} from "@/lib/plans";
import { PhotoUpload } from "@/components/editor/photo-upload";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Boxes, CalendarClock, Check, Plus, Trash2 } from "lucide-react";
import {
  addStock,
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  setStockExact,
  updateCategory,
  updateProduct,
} from "./actions";
import { decStock, incStock, toggleTrackStock } from "@/app/(app)/stock/actions";
import styles from "./produits.module.css";
import type { ProductsDict } from "@/lib/i18n/get-dictionary";
import { KARLMADA_BLOCK_MESSAGE } from "@/lib/karlmada-constants";

type Category = { id: string; name: string };
type Sale = { count: number; cents: number };
type Sales = Record<string, Sale>;

type ProductFields = {
  name: string;
  price_cents: number;
  description: string;
  duration_min: number;
};

// ------------------------------------------------------------- carte produit
// Champs texte NON contrôlés (refs) : on n'écrit en base qu'au clic sur
// « Confirmer », plus à chaque frappe. Composant au niveau module → jamais
// remonté, donc le focus ne saute plus.
type CardProps = {
  product: Product;
  stat?: Sale;
  userId: string;
  t: ProductsDict;
  onSave: (id: string, fields: ProductFields) => Promise<void>;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onImage: (id: string, url: string | null) => void;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  onAdd: (id: string, n: number) => void;
  onSet: (id: string, n: number) => void;
  onToggleTrack: (id: string) => void;
};

function ProductCard({
  product,
  stat,
  userId,
  t,
  onSave,
  onDelete,
  onToggleActive,
  onImage,
  onInc,
  onDec,
  onAdd,
  onSet,
  onToggleTrack,
}: CardProps) {
  const { locale, dictionary } = useI18n();
  const nameRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);
  const restockRef = useRef<HTMLInputElement>(null);
  const setRef = useRef<HTMLInputElement>(null);
  // Le prix est contrôlé localement (PriceInput) ; le composant est au niveau
  // module donc pas de remontage → pas de perte de focus.
  const [priceCents, setPriceCents] = useState(product.price_cents);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function confirm() {
    const fields: ProductFields = {
      name: (nameRef.current?.value ?? "").trim().slice(0, 80) || t.card.product,
      price_cents: priceCents,
      description: (descRef.current?.value ?? "").trim().slice(0, 400),
      duration_min: Math.min(
        600,
        Math.max(5, Math.round(Number(durationRef.current?.value) || product.duration_min || 60))
      ),
    };
    setSaving(true);
    await onSave(product.id, fields);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const out = product.track_stock && product.stock <= 0;
  const isReservation = product.kind === "reservation";

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <Input
          ref={nameRef}
          defaultValue={product.name}
          maxLength={80}
          className={styles.nameInput}
          placeholder={t.card.namePlaceholder}
        />
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={product.active}
            onChange={(e) => onToggleActive(product.id, e.target.checked)}
          />
          {product.active ? t.card.displayed : t.card.hidden}
        </label>
        <span className={styles.kindBadge}>
          {isReservation ? <CalendarClock aria-hidden="true" /> : <Boxes aria-hidden="true" />}
          {isReservation ? t.card.reservation : t.card.product}
        </span>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label={t.card.deleteProduct}
          onClick={() => onDelete(product.id)}
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>

      <div className={isReservation ? styles.row3 : styles.row2}>
        <div className={styles.priceField}>
          <Label>{t.card.price}</Label>
          <PriceInput cents={priceCents} onCents={setPriceCents} />
        </div>
        {isReservation && (
          <div className={styles.priceField}>
            <Label>{t.card.duration}</Label>
            <Input
              ref={durationRef}
              type="number"
              min={5}
              max={600}
              step={5}
              defaultValue={product.duration_min}
            />
          </div>
        )}
        <div className={styles.descField}>
          <Label>{t.card.description}</Label>
          <Input ref={descRef} defaultValue={product.description} maxLength={400} placeholder={t.card.descriptionPlaceholder} />
        </div>
      </div>

      {!isReservation && (
        <div className={styles.photoRow}>
          <PhotoUpload
            userId={userId}
            label={product.image_url ? t.card.changePhoto : t.card.addPhoto}
            messages={dictionary.photoUpload}
            onUploaded={(url) => onImage(product.id, url)}
          />
          {product.image_url && (
            <button type="button" className={styles.textBtn} onClick={() => onImage(product.id, null)}>
              {t.card.removePhoto}
            </button>
          )}
        </div>
      )}

      <div className={styles.confirmRow}>
        <Button size="sm" onClick={confirm} disabled={saving}>
          {saved ? (
            <>
              <Check aria-hidden="true" /> {t.card.saved}
            </>
          ) : saving ? (
            t.card.saving
          ) : (
            t.card.confirm
          )}
        </Button>
        <span className={styles.confirmHint}>
          {isReservation ? t.card.confirmHintReservation : t.card.confirmHintProduct}
        </span>
      </div>

      {!isReservation && (
      <div className={styles.stockZone}>
        {product.track_stock ? (
          <>
            <div className={styles.stockLine}>
              <Boxes aria-hidden="true" />
              <b className={out ? styles.stockOut : ""}>{product.stock}</b>
              <span>{t.card.inStock}</span>
              <button type="button" className={styles.step} aria-label={t.card.removeOne} onClick={() => onDec(product.id)}>
                −
              </button>
              <button type="button" className={styles.step} aria-label={t.card.addOne} onClick={() => onInc(product.id)}>
                +
              </button>
              <span className={styles.stockForm}>
                <input ref={restockRef} type="number" min={1} placeholder={t.card.restockPlaceholder} className={styles.qty} />
                <button
                  type="button"
                  className={styles.smallBtn}
                  onClick={() => {
                    const n = Math.max(0, Math.round(Number(restockRef.current?.value) || 0));
                    if (n > 0) onAdd(product.id, n);
                    if (restockRef.current) restockRef.current.value = "";
                  }}
                >
                  {t.card.restock}
                </button>
              </span>
              <span className={styles.stockForm}>
                <input ref={setRef} type="number" min={0} defaultValue={product.stock} className={styles.qty} />
                <button
                  type="button"
                  className={styles.smallBtn}
                  onClick={() => onSet(product.id, Math.max(0, Math.round(Number(setRef.current?.value) || 0)))}
                >
                  {t.card.setExact}
                </button>
              </span>
            </div>
            <button type="button" className={styles.textBtn} onClick={() => onToggleTrack(product.id)}>
              {t.card.stopTracking}
            </button>
          </>
        ) : (
          <button type="button" className={styles.smallBtn} onClick={() => onToggleTrack(product.id)}>
            <Boxes aria-hidden="true" /> {t.card.trackStock}
          </button>
        )}

        <span className={styles.sales}>
          {stat && stat.count > 0
            ? `${stat.count} ${stat.count > 1 ? t.card.soldPlural : t.card.soldSingular} · ${formatPrice(stat.cents, locale)}`
            : t.card.noSales}
        </span>
      </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ en-tête catégorie
function CategoryHeader({
  category,
  t,
  onSaveName,
  onDelete,
}: {
  category: Category;
  t: ProductsDict;
  onSaveName: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);

  async function confirm() {
    await onSaveName(category.id, (nameRef.current?.value ?? "").trim().slice(0, 60) || t.category.defaultName);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className={styles.categoryHead}>
      <Input ref={nameRef} defaultValue={category.name} maxLength={60} className={styles.categoryName} />
      <Button variant="secondary" size="sm" onClick={confirm}>
        {saved ? <Check aria-hidden="true" /> : t.category.save}
      </Button>
      <button
        type="button"
        className={styles.iconBtn}
        aria-label={t.category.deleteCategory}
        onClick={() => onDelete(category.id)}
      >
        <Trash2 aria-hidden="true" />
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ manager
type Props = {
  initialCategories: Category[];
  initialProducts: Product[];
  sales: Sales;
  userId: string;
  // La 1re catégorie du compte (tous projets) est offerte.
  firstCategoryFree: boolean;
  t: ProductsDict;
};

export function ProductsManager({ initialCategories, initialProducts, sales, userId, firstCategoryFree, t }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categoryCreated, setCategoryCreated] = useState(false);
  const [pending, startTransition] = useTransition();
  const categoryFree = firstCategoryFree && !categoryCreated;

  // Message clair quand le débit de crédits échoue.
  function creditsErrorMessage(error: string, cost: number): string | null {
    if (error === "insufficient_credits") {
      return (cost > 1 ? t.errors.insufficientCreditsPlural : t.errors.insufficientCredits).replace(
        "{cost}",
        String(cost)
      );
    }
    if (error === "subscription_required") {
      return t.errors.subscriptionRequired;
    }
    return null;
  }
  function translateError(error: string): string {
    const code = error === KARLMADA_BLOCK_MESSAGE ? "content_blocked" : error;
    return t.errors[code as keyof typeof t.errors] ?? t.errors.unknown;
  }

  function patchLocal(id: string, fields: Partial<Product>) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...fields } : p)));
  }

  // --------------------------------------------------------------- catégories
  async function saveCategoryName(id: string, name: string) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    const r = await updateCategory(id, name);
    if (r.error) toast.error(translateError(r.error));
  }
  function addCategory() {
    startTransition(async () => {
      const r = await createCategory();
      if (r.error || !r.id) {
        toast.error(
          (r.error && creditsErrorMessage(r.error, CATEGORY_CREATE_COST)) ??
            (r.error ? translateError(r.error) : t.errors.creation_failed)
        );
        return;
      }
      setCategoryCreated(true);
      setCategories((prev) => [...prev, { id: r.id!, name: t.category.defaultName }]);
    });
  }
  function removeCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setProducts((prev) => prev.map((p) => (p.category_id === id ? { ...p, category_id: null } : p)));
    startTransition(async () => {
      const r = await deleteCategory(id);
      if (r.error) toast.error(translateError(r.error));
    });
  }

  // ----------------------------------------------------------------- produits
  async function saveProduct(id: string, fields: ProductFields) {
    patchLocal(id, fields);
    const r = await updateProduct(id, fields);
    if (r.error) toast.error(translateError(r.error));
  }
  function toggleActive(id: string, active: boolean) {
    patchLocal(id, { active });
    startTransition(async () => {
      const r = await updateProduct(id, { active });
      if (r.error) toast.error(translateError(r.error));
    });
  }
  function setImage(id: string, url: string | null) {
    patchLocal(id, { image_url: url });
    startTransition(async () => {
      const r = await updateProduct(id, { image_url: url });
      if (r.error) toast.error(translateError(r.error));
    });
  }
  function addProductTo(categoryId: string | null, kind: ProductKind = "product") {
    startTransition(async () => {
      const r = await createProduct(categoryId, kind);
      if (r.error || !r.id) {
        const cost = kind === "reservation" ? RESERVATION_ADD_COST : PRODUCT_ADD_COST;
        toast.error(
          (r.error && creditsErrorMessage(r.error, cost)) ??
            (r.error ? translateError(r.error) : t.errors.creation_failed)
        );
        return;
      }
      setProducts((prev) => [
        ...prev,
        {
          id: r.id!,
          category_id: categoryId,
          page_id: r.pageId ?? "",
          kind,
          name: kind === "reservation" ? t.manager.defaultReservationName : t.manager.defaultProductName,
          description: "",
          price_cents: 0,
          duration_min: 60,
          image_url: null,
          active: true,
          track_stock: false,
          stock: 0,
          position: prev.length,
          created_at: "",
        },
      ]);
    });
  }
  function removeProduct(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    startTransition(async () => {
      const r = await deleteProduct(id);
      if (r.error) toast.error(translateError(r.error));
    });
  }

  // -------------------------------------------------------------------- stock
  function bump(id: string, next: number) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: Math.max(0, next) } : p)));
  }
  function stockOf(id: string) {
    return products.find((p) => p.id === id)?.stock ?? 0;
  }
  const onInc = (id: string) => {
    bump(id, stockOf(id) + 1);
    startTransition(() => incStock(id));
  };
  const onDec = (id: string) => {
    bump(id, stockOf(id) - 1);
    startTransition(() => decStock(id));
  };
  const onAdd = (id: string, n: number) => {
    bump(id, stockOf(id) + n);
    startTransition(() => addStock(id, n));
  };
  const onSet = (id: string, n: number) => {
    bump(id, n);
    startTransition(() => setStockExact(id, n));
  };
  const onToggleTrack = (id: string) => {
    patchLocal(id, { track_stock: !products.find((p) => p.id === id)?.track_stock });
    startTransition(() => toggleTrackStock(id));
  };

  const cardHandlers = {
    userId,
    t,
    onSave: saveProduct,
    onDelete: removeProduct,
    onToggleActive: toggleActive,
    onImage: setImage,
    onInc,
    onDec,
    onAdd,
    onSet,
    onToggleTrack,
  };

  const uncategorized = products.filter(
    (p) => !p.category_id || !categories.some((c) => c.id === p.category_id)
  );

  return (
    <div className={styles.manager}>
      {categories.map((category) => {
        const catProducts = products.filter((p) => p.category_id === category.id);
        return (
          <section key={category.id} className={styles.category}>
            <CategoryHeader category={category} t={t} onSaveName={saveCategoryName} onDelete={removeCategory} />
            <div className={styles.cards}>
              {catProducts.map((p) => (
                <ProductCard key={p.id} product={p} stat={sales[p.id]} {...cardHandlers} />
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={() => addProductTo(category.id)} disabled={pending}>
              <Plus aria-hidden="true" /> {t.category.addProduct.replace("{cost}", String(PRODUCT_ADD_COST))}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => addProductTo(category.id, "reservation")} disabled={pending}>
              <CalendarClock aria-hidden="true" /> {t.category.addReservation.replace("{cost}", String(RESERVATION_ADD_COST))}
            </Button>
          </section>
        );
      })}

      {uncategorized.length > 0 && (
        <section className={styles.category}>
          <div className={styles.categoryHead}>
            <h2 className={styles.categoryStatic}>{t.category.otherProducts}</h2>
          </div>
          <div className={styles.cards}>
            {uncategorized.map((p) => (
              <ProductCard key={p.id} product={p} stat={sales[p.id]} {...cardHandlers} />
            ))}
          </div>
        </section>
      )}

      <div className={styles.managerActions}>
        <Button variant="secondary" onClick={addCategory} disabled={pending}>
          <Plus aria-hidden="true" /> {t.manager.addCategory}{" "}
          {categoryFree ? t.manager.free : `${CATEGORY_CREATE_COST} cr.`}
        </Button>
        <Button variant="ghost" onClick={() => addProductTo(null)} disabled={pending}>
          <Plus aria-hidden="true" /> {t.manager.productNoCategory.replace("{cost}", String(PRODUCT_ADD_COST))}
        </Button>
        <Button variant="ghost" onClick={() => addProductTo(null, "reservation")} disabled={pending}>
          <CalendarClock aria-hidden="true" /> {t.manager.reservationNoCategory.replace("{cost}", String(RESERVATION_ADD_COST))}
        </Button>
      </div>
    </div>
  );
}
