"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Boxes, Check, PackagePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PRODUCT_CREATE_COST } from "@/lib/plans";
import { PhotoUpload } from "@/components/editor/photo-upload";
import { FluxBrand } from "@/components/flux-brand";
import { PriceInput } from "@/components/ui/price-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createProductsFromTunnel } from "@/app/(app)/produits/actions";
import styles from "./setup-tunnel.module.css";
import { useI18n } from "@/components/i18n-provider";
import { KARLMADA_BLOCK_MESSAGE } from "@/lib/karlmada-constants";

type DraftProduct = {
  name: string;
  description: string;
  price_cents: number;
  image_url: string | null;
  track_stock: boolean;
  stock: number;
  active: boolean;
};

const emptyProduct = (): DraftProduct => ({
  name: "",
  description: "",
  price_cents: 0,
  image_url: null,
  track_stock: false,
  stock: 0,
  active: true,
});

export function ProductTunnel({ userId, balance }: { userId: string; balance: number }) {
  const router = useRouter();
  const { products: dict, dictionary } = useI18n();
  const t = dict.tunnel;
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState("");
  const [products, setProducts] = useState<DraftProduct[]>([emptyProduct()]);
  const [pending, startTransition] = useTransition();
  const [creditsDialog, setCreditsDialog] = useState<
    "insufficient_credits" | "subscription_required" | null
  >(null);
  const enough = balance >= PRODUCT_CREATE_COST;
  const progress = ((step + 1) / 8) * 100;

  function patch(index: number, fields: Partial<DraftProduct>) {
    setProducts((current) =>
      current.map((product, productIndex) =>
        productIndex === index ? { ...product, ...fields } : product
      )
    );
  }

  const canContinue =
    step === 1
      ? Boolean(category.trim() && products.every((product) => product.name.trim()))
      : step === 2
        ? products.every((product) => product.price_cents >= 0)
        : true;

  function save() {
    startTransition(async () => {
      const result = await createProductsFromTunnel(category, products);
      if (
        result.error === "insufficient_credits" ||
        result.error === "subscription_required"
      ) {
        setCreditsDialog(result.error);
        return;
      }
      if (result.error) {
        const code = result.error === KARLMADA_BLOCK_MESSAGE ? "content_blocked" : result.error;
        toast.error(dict.errors[code as keyof typeof dict.errors] ?? dict.errors.unknown);
        return;
      }
      // Enchaînement FLUX : après les produits, on configure les horaires.
      // Les 15 cr débités ici couvrent les deux tunnels (l'agenda est inclus).
      toast.success(t.successToast);
      router.push("/agenda");
      router.refresh();
    });
  }

  return (
    <div className={styles.tunnel}>
      <header className={styles.header}>
        <Link href="/espace" className={styles.brand}><FluxBrand /></Link>
        <div className={styles.progressMeta}>
          <span>{t.step.replace("{current}", String(step + 1))}</span>
          <div className={styles.progress}><i style={{ width: `${progress}%` }} /></div>
        </div>
        <Link href="/produits" className={styles.exit}>{t.myProducts}</Link>
      </header>

      <main className={styles.stage}>
        {step === 0 && (
          <section className={styles.intro}>
            <span className={styles.icon}><PackagePlus aria-hidden="true" /></span>
            <p className={styles.kicker}>{t.intro.kicker}</p>
            <h1>{t.intro.title} <em>{t.intro.titleEm}</em></h1>
            <p>{t.intro.text}</p>
            <button className={`flux-button-smooth ${styles.primary}`} type="button" onClick={() => setStep(1)}>{t.intro.cta} <ArrowRight aria-hidden="true" /></button>
          </section>
        )}

        {step === 1 && (
          <Screen kicker={t.category.kicker} title={<>{t.category.titleStart} <em>{t.category.titleEm}</em></>} subtitle={t.category.subtitle}>
            <div className={styles.formGrid}>
              <label className={styles.field}><span>{t.category.nameLabel}</span><input className={styles.input} value={category} maxLength={60} placeholder={t.category.namePlaceholder} onChange={(event) => setCategory(event.target.value)} /></label>
              {products.map((product, index) => (
                <div className={styles.productRow} key={index}>
                  <label className={styles.field}><span>{t.category.productLabel.replace("{index}", String(index + 1))}</span><input className={styles.input} value={product.name} maxLength={80} placeholder={t.category.productPlaceholder} onChange={(event) => patch(index, { name: event.target.value })} /></label>
                  {products.length > 1 && <button type="button" aria-label={t.category.removeProduct.replace("{index}", String(index + 1))} onClick={() => setProducts((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 aria-hidden="true" /></button>}
                </div>
              ))}
              {products.length < 8 && <button className={styles.addButton} type="button" onClick={() => setProducts((current) => [...current, emptyProduct()])}><Plus aria-hidden="true" /> {t.category.addAnother}</button>}
            </div>
          </Screen>
        )}

        {step === 2 && <ProductFields title={t.price.title} kicker={t.price.kicker} subtitle={t.price.subtitle} products={products} render={(product, index) => <label className={styles.field}><span>{product.name || t.price.defaultName.replace("{index}", String(index + 1))} · {t.price.priceLabel}</span><PriceInput className={styles.input} cents={product.price_cents} placeholder={t.price.placeholder} onCents={(c) => patch(index, { price_cents: c })} /></label>} />}
        {step === 3 && <ProductFields title={t.description.title} kicker={t.description.kicker} subtitle={t.description.subtitle} products={products} render={(product, index) => <label className={styles.field}><span>{product.name || t.price.defaultName.replace("{index}", String(index + 1))}</span><textarea className={styles.textarea} maxLength={400} value={product.description} placeholder={t.description.placeholder} onChange={(event) => patch(index, { description: event.target.value })} /></label>} />}
        {step === 4 && (
          <Screen kicker={t.photo.kicker} title={<>{t.photo.titleStart} <em>{t.photo.titleEm}</em></>} subtitle={t.photo.subtitle}>
            <div className={styles.photoGrid}>{products.map((product, index) => <article className={styles.photoCard} key={index}><strong>{product.name || t.price.defaultName.replace("{index}", String(index + 1))}</strong>{product.image_url && <Image src={product.image_url} width={520} height={240} unoptimized alt="" />}<PhotoUpload userId={userId} label={product.image_url ? t.photo.change : t.photo.add} messages={dictionary.photoUpload} onUploaded={(url) => patch(index, { image_url: url })} /></article>)}</div>
          </Screen>
        )}
        {step === 5 && (
          <Screen kicker={t.stock.kicker} title={t.stock.title} subtitle={t.stock.subtitle}>
            <div className={styles.cards}>
              {products.map((product, index) => (
                <article className={styles.stockCard} key={index}>
                  <div>
                    <strong>{product.name}</strong>
                    <small>{product.track_stock ? t.stock.trackedHint : t.stock.untrackedHint}</small>
                  </div>
                  <button
                    type="button"
                    className={product.track_stock ? styles.stockToggleActive : styles.stockToggle}
                    aria-pressed={product.track_stock}
                    onClick={() => patch(index, { track_stock: !product.track_stock })}
                  >
                    {product.track_stock ? <Check aria-hidden="true" /> : <Boxes aria-hidden="true" />}
                    {product.track_stock ? t.stock.tracked : t.stock.track}
                  </button>
                  {product.track_stock && (
                    <label className={styles.stockQuantity}>
                      <span>{t.stock.quantityLabel}</span>
                      <input
                        className={styles.input}
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={product.stock}
                        onChange={(event) =>
                          patch(index, {
                            stock: Math.max(0, Math.floor(Number(event.target.value) || 0)),
                          })
                        }
                      />
                      <small>{product.stock > 1 ? t.stock.unitPlural : t.stock.unitSingular}</small>
                    </label>
                  )}
                </article>
              ))}
            </div>
          </Screen>
        )}
        {step === 6 && <ToggleScreen kicker={t.visibility.kicker} title={t.visibility.title} subtitle={t.visibility.subtitle} products={products} field="active" patch={patch} yes={t.visibility.yes} no={t.visibility.no} toggleAria={t.visibility.toggleAria} />}
        {step === 7 && (
          <Screen kicker={t.confirm.kicker} title={<>{t.confirm.titleStart} <em>{t.confirm.titleEm}</em></>} subtitle={t.confirm.subtitle}>
            <div className={styles.reviewGrid}>
              <article className={styles.reviewCard}><small>{t.confirm.category}</small><strong>{category}</strong></article>
              <article className={styles.reviewCard}><small>{t.confirm.products}</small><strong>{products.length} {products.length > 1 ? t.confirm.productPlural : t.confirm.productSingular}</strong></article>
              {products.map((product, index) => <article className={styles.reviewCard} key={index}><small>{product.active ? t.confirm.online : t.confirm.draft}</small><strong>{product.name} · {(product.price_cents / 100).toLocaleString("fr-FR")} €{product.track_stock ? ` · ${product.stock} ${t.confirm.inStock}` : ""}</strong></article>)}
              <article className={styles.reviewCard}><small>{t.confirm.totalCost}</small><strong>{t.confirm.costValue.replace("{cost}", String(PRODUCT_CREATE_COST)).replace("{balance}", String(balance))}</strong></article>
            </div>
            {!enough && <p className={styles.subtitle}>{(PRODUCT_CREATE_COST - balance > 1 ? t.confirm.missingPlural : t.confirm.missingSingular).replace("{count}", String(PRODUCT_CREATE_COST - balance))} <Link href="/credits" style={{ textDecoration: "underline" }}>{t.confirm.recharge}</Link>.</p>}
            <div className={styles.confirm}><button className={styles.back} type="button" onClick={() => setStep(6)}><ArrowLeft aria-hidden="true" /> {t.confirm.edit}</button><button className={`flux-button-smooth ${styles.primary}`} type="button" disabled={pending || !enough} onClick={save}>{pending ? t.confirm.creating : t.confirm.create.replace("{cost}", String(PRODUCT_CREATE_COST))} <Check aria-hidden="true" /></button></div>
          </Screen>
        )}
      </main>

      <Dialog open={creditsDialog !== null} onOpenChange={(next) => !next && setCreditsDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creditsDialog === "subscription_required"
                ? t.credits.trialTitle
                : t.credits.insufficientTitle}
            </DialogTitle>
            <DialogDescription>
              {creditsDialog === "subscription_required"
                ? t.credits.trial
                : t.credits.insufficient.replace("{cost}", String(PRODUCT_CREATE_COST))}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreditsDialog(null)}>
              {t.credits.later}
            </Button>
            <Button asChild>
              <Link href={creditsDialog === "subscription_required" ? "/formules" : "/credits"}>
                {creditsDialog === "subscription_required"
                  ? t.credits.choosePlan
                  : t.credits.rechargeCredits}
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {step > 0 && step < 7 && <footer className={styles.controls}><button className={styles.back} type="button" onClick={() => setStep((current) => current - 1)}><ArrowLeft aria-hidden="true" /> {t.back}</button><button className={`flux-button-smooth ${styles.primary}`} type="button" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>{t.continue} <ArrowRight aria-hidden="true" /></button></footer>}
    </div>
  );
}

function Screen({ kicker, title, subtitle, children }: { kicker: string; title: React.ReactNode; subtitle: string; children: React.ReactNode }) {
  return <section className={styles.screen}><p className={styles.kicker}>{kicker}</p><h1>{title}</h1><p className={styles.subtitle}>{subtitle}</p>{children}</section>;
}

function ProductFields({ title, kicker, subtitle, products, render }: { title: string; kicker: string; subtitle: string; products: DraftProduct[]; render: (product: DraftProduct, index: number) => React.ReactNode }) {
  return <Screen kicker={kicker} title={title} subtitle={subtitle}><div className={styles.cards}>{products.map(render)}</div></Screen>;
}

function ToggleScreen({ kicker, title, subtitle, products, field, patch, yes, no, toggleAria }: { kicker: string; title: string; subtitle: string; products: DraftProduct[]; field: "track_stock" | "active"; patch: (index: number, fields: Partial<DraftProduct>) => void; yes: string; no: string; toggleAria: string }) {
  return <Screen kicker={kicker} title={title} subtitle={subtitle}><div className={styles.cards}>{products.map((product, index) => <article className={styles.productRow} key={index}><div><strong>{product.name}</strong><p className={styles.subtitle}>{product[field] ? yes : no}</p></div><button type="button" aria-label={toggleAria.replace("{name}", product.name)} onClick={() => patch(index, { [field]: !product[field] })}>{product[field] ? <Check aria-hidden="true" /> : <Boxes aria-hidden="true" />}</button></article>)}</div></Screen>;
}
