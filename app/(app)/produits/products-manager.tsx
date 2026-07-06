"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { Product, ProductKind } from "@/lib/types";
import { formatPrice } from "@/lib/types";
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
      name: (nameRef.current?.value ?? "").trim().slice(0, 80) || "Produit",
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
          placeholder="Nom du produit"
        />
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={product.active}
            onChange={(e) => onToggleActive(product.id, e.target.checked)}
          />
          {product.active ? "Affiché" : "Masqué"}
        </label>
        <span className={styles.kindBadge}>
          {isReservation ? <CalendarClock aria-hidden="true" /> : <Boxes aria-hidden="true" />}
          {isReservation ? "Réservation" : "Produit"}
        </span>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label="Supprimer le produit"
          onClick={() => onDelete(product.id)}
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>

      <div className={isReservation ? styles.row3 : styles.row2}>
        <div className={styles.priceField}>
          <Label>Prix (€)</Label>
          <PriceInput cents={priceCents} onCents={setPriceCents} />
        </div>
        {isReservation && (
          <div className={styles.priceField}>
            <Label>Durée (min)</Label>
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
          <Label>Description</Label>
          <Input ref={descRef} defaultValue={product.description} maxLength={400} placeholder="Courte description" />
        </div>
      </div>

      {!isReservation && (
        <div className={styles.photoRow}>
          <PhotoUpload
            userId={userId}
            label={product.image_url ? "Changer la photo" : "Ajouter une photo"}
            onUploaded={(url) => onImage(product.id, url)}
          />
          {product.image_url && (
            <button type="button" className={styles.textBtn} onClick={() => onImage(product.id, null)}>
              retirer la photo
            </button>
          )}
        </div>
      )}

      <div className={styles.confirmRow}>
        <Button size="sm" onClick={confirm} disabled={saving}>
          {saved ? (
            <>
              <Check aria-hidden="true" /> Enregistré
            </>
          ) : saving ? (
            "Enregistrement…"
          ) : (
            "Confirmer mes choix"
          )}
        </Button>
        <span className={styles.confirmHint}>
          {isReservation ? "Nom · prix · durée · description" : "Nom · prix · description"}
        </span>
      </div>

      {!isReservation && (
      <div className={styles.stockZone}>
        {product.track_stock ? (
          <>
            <div className={styles.stockLine}>
              <Boxes aria-hidden="true" />
              <b className={out ? styles.stockOut : ""}>{product.stock}</b>
              <span>en stock</span>
              <button type="button" className={styles.step} aria-label="Retirer un" onClick={() => onDec(product.id)}>
                −
              </button>
              <button type="button" className={styles.step} aria-label="Ajouter un" onClick={() => onInc(product.id)}>
                +
              </button>
              <span className={styles.stockForm}>
                <input ref={restockRef} type="number" min={1} placeholder="+ qté" className={styles.qty} />
                <button
                  type="button"
                  className={styles.smallBtn}
                  onClick={() => {
                    const n = Math.max(0, Math.round(Number(restockRef.current?.value) || 0));
                    if (n > 0) onAdd(product.id, n);
                    if (restockRef.current) restockRef.current.value = "";
                  }}
                >
                  Réappro
                </button>
              </span>
              <span className={styles.stockForm}>
                <input ref={setRef} type="number" min={0} defaultValue={product.stock} className={styles.qty} />
                <button
                  type="button"
                  className={styles.smallBtn}
                  onClick={() => onSet(product.id, Math.max(0, Math.round(Number(setRef.current?.value) || 0)))}
                >
                  Définir
                </button>
              </span>
            </div>
            <button type="button" className={styles.textBtn} onClick={() => onToggleTrack(product.id)}>
              Ne plus suivre le stock
            </button>
          </>
        ) : (
          <button type="button" className={styles.smallBtn} onClick={() => onToggleTrack(product.id)}>
            <Boxes aria-hidden="true" /> Suivre le stock
          </button>
        )}

        <span className={styles.sales}>
          {stat && stat.count > 0
            ? `${stat.count} vendu${stat.count > 1 ? "s" : ""} · ${formatPrice(stat.cents)}`
            : "Aucune vente"}
        </span>
      </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ en-tête catégorie
function CategoryHeader({
  category,
  onSaveName,
  onDelete,
}: {
  category: Category;
  onSaveName: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);

  async function confirm() {
    await onSaveName(category.id, (nameRef.current?.value ?? "").trim().slice(0, 60) || "Catégorie");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className={styles.categoryHead}>
      <Input ref={nameRef} defaultValue={category.name} maxLength={60} className={styles.categoryName} />
      <Button variant="secondary" size="sm" onClick={confirm}>
        {saved ? <Check aria-hidden="true" /> : "Enregistrer"}
      </Button>
      <button
        type="button"
        className={styles.iconBtn}
        aria-label="Supprimer la catégorie"
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
};

export function ProductsManager({ initialCategories, initialProducts, sales, userId }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [pending, startTransition] = useTransition();

  function patchLocal(id: string, fields: Partial<Product>) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...fields } : p)));
  }

  // --------------------------------------------------------------- catégories
  async function saveCategoryName(id: string, name: string) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    const r = await updateCategory(id, name);
    if (r.error) toast.error(r.error);
  }
  function addCategory() {
    startTransition(async () => {
      const r = await createCategory();
      if (r.error || !r.id) {
        toast.error(r.error ?? "Création impossible.");
        return;
      }
      setCategories((prev) => [...prev, { id: r.id!, name: "Nouvelle catégorie" }]);
    });
  }
  function removeCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setProducts((prev) => prev.map((p) => (p.category_id === id ? { ...p, category_id: null } : p)));
    startTransition(async () => {
      const r = await deleteCategory(id);
      if (r.error) toast.error(r.error);
    });
  }

  // ----------------------------------------------------------------- produits
  async function saveProduct(id: string, fields: ProductFields) {
    patchLocal(id, fields);
    const r = await updateProduct(id, fields);
    if (r.error) toast.error(r.error);
  }
  function toggleActive(id: string, active: boolean) {
    patchLocal(id, { active });
    startTransition(async () => {
      const r = await updateProduct(id, { active });
      if (r.error) toast.error(r.error);
    });
  }
  function setImage(id: string, url: string | null) {
    patchLocal(id, { image_url: url });
    startTransition(async () => {
      const r = await updateProduct(id, { image_url: url });
      if (r.error) toast.error(r.error);
    });
  }
  function addProductTo(categoryId: string | null, kind: ProductKind = "product") {
    startTransition(async () => {
      const r = await createProduct(categoryId, kind);
      if (r.error || !r.id) {
        toast.error(r.error ?? "Création impossible.");
        return;
      }
      setProducts((prev) => [
        ...prev,
        {
          id: r.id!,
          category_id: categoryId,
          page_id: r.pageId ?? "",
          kind,
          name: kind === "reservation" ? "Nouvelle réservation" : "Nouveau produit",
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
      if (r.error) toast.error(r.error);
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
            <CategoryHeader category={category} onSaveName={saveCategoryName} onDelete={removeCategory} />
            <div className={styles.cards}>
              {catProducts.map((p) => (
                <ProductCard key={p.id} product={p} stat={sales[p.id]} {...cardHandlers} />
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={() => addProductTo(category.id)} disabled={pending}>
              <Plus aria-hidden="true" /> Ajouter un produit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => addProductTo(category.id, "reservation")} disabled={pending}>
              <CalendarClock aria-hidden="true" /> Ajouter une réservation
            </Button>
          </section>
        );
      })}

      {uncategorized.length > 0 && (
        <section className={styles.category}>
          <div className={styles.categoryHead}>
            <h2 className={styles.categoryStatic}>Autres produits</h2>
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
          <Plus aria-hidden="true" /> Ajouter une catégorie
        </Button>
        <Button variant="ghost" onClick={() => addProductTo(null)} disabled={pending}>
          <Plus aria-hidden="true" /> Produit sans catégorie
        </Button>
        <Button variant="ghost" onClick={() => addProductTo(null, "reservation")} disabled={pending}>
          <CalendarClock aria-hidden="true" /> Réservation sans catégorie
        </Button>
      </div>
    </div>
  );
}
