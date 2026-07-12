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
        toast.error(result.error);
        return;
      }
      // Enchaînement FLUX : après les produits, on configure les horaires.
      // Les 15 cr débités ici couvrent les deux tunnels (l'agenda est inclus).
      toast.success("Tes produits sont prêts. Dernière étape : tes horaires.");
      router.push("/agenda");
      router.refresh();
    });
  }

  return (
    <div className={styles.tunnel}>
      <header className={styles.header}>
        <Link href="/espace" className={styles.brand}><FluxBrand /></Link>
        <div className={styles.progressMeta}>
          <span>Étape {step + 1} sur 8</span>
          <div className={styles.progress}><i style={{ width: `${progress}%` }} /></div>
        </div>
        <Link href="/produits" className={styles.exit}>Mes produits</Link>
      </header>

      <main className={styles.stage}>
        {step === 0 && (
          <section className={styles.intro}>
            <span className={styles.icon}><PackagePlus aria-hidden="true" /></span>
            <p className={styles.kicker}>Création produit FLUX</p>
            <h1>Transforme ton savoir-faire en produits <em>prêts à vendre.</em></h1>
            <p>Une catégorie, un ou plusieurs produits, puis Flux organise tout dans ta vitrine.</p>
            <button className={styles.primary} type="button" onClick={() => setStep(1)}>Créer mes produits <ArrowRight aria-hidden="true" /></button>
          </section>
        )}

        {step === 1 && (
          <Screen kicker="Ta catégorie" title={<>Comment veux-tu <em>les organiser ?</em></>} subtitle="Nomme la catégorie, puis ajoute tous les produits que tu veux créer maintenant.">
            <div className={styles.formGrid}>
              <label className={styles.field}><span>Nom de la catégorie</span><input className={styles.input} value={category} maxLength={60} placeholder="Ex : Soins du visage" onChange={(event) => setCategory(event.target.value)} /></label>
              {products.map((product, index) => (
                <div className={styles.productRow} key={index}>
                  <label className={styles.field}><span>Produit {index + 1}</span><input className={styles.input} value={product.name} maxLength={80} placeholder="Ex : Soin éclat" onChange={(event) => patch(index, { name: event.target.value })} /></label>
                  {products.length > 1 && <button type="button" aria-label={`Retirer le produit ${index + 1}`} onClick={() => setProducts((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 aria-hidden="true" /></button>}
                </div>
              ))}
              {products.length < 8 && <button className={styles.addButton} type="button" onClick={() => setProducts((current) => [...current, emptyProduct()])}><Plus aria-hidden="true" /> Ajouter un autre produit</button>}
            </div>
          </Screen>
        )}

        {step === 2 && <ProductFields title="Quel est leur prix ?" kicker="Le juste prix" subtitle="Indique un prix pour chaque produit. Tu pourras toujours le modifier." products={products} render={(product, index) => <label className={styles.field}><span>{product.name || `Produit ${index + 1}`} · Prix en €</span><PriceInput className={styles.input} cents={product.price_cents} placeholder="Ex : 20" onCents={(c) => patch(index, { price_cents: c })} /></label>} />}
        {step === 3 && <ProductFields title="Qu’est-ce qui les rend désirables ?" kicker="La description" subtitle="Une phrase simple suffit pour aider le client à choisir." products={products} render={(product, index) => <label className={styles.field}><span>{product.name || `Produit ${index + 1}`}</span><textarea className={styles.textarea} maxLength={400} value={product.description} placeholder="Ce que le client reçoit, ressent ou gagne…" onChange={(event) => patch(index, { description: event.target.value })} /></label>} />}
        {step === 4 && (
          <Screen kicker="La photo" title={<>Donne-leur une présence <em>visuelle.</em></>} subtitle="Une photo par produit. Cette étape reste facultative.">
            <div className={styles.photoGrid}>{products.map((product, index) => <article className={styles.photoCard} key={index}><strong>{product.name || `Produit ${index + 1}`}</strong>{product.image_url && <Image src={product.image_url} width={520} height={240} unoptimized alt="" />}<PhotoUpload userId={userId} label={product.image_url ? "Changer la photo" : "Ajouter une photo"} onUploaded={(url) => patch(index, { image_url: url })} /></article>)}</div>
          </Screen>
        )}
        {step === 5 && (
          <Screen kicker="Le stock" title="Veux-tu suivre les quantités ?" subtitle="Active le suivi puis indique le nombre d’unités disponibles aujourd’hui.">
            <div className={styles.cards}>
              {products.map((product, index) => (
                <article className={styles.stockCard} key={index}>
                  <div>
                    <strong>{product.name}</strong>
                    <small>{product.track_stock ? "Flux te préviendra quand le stock arrive à zéro." : "Aucune limite de quantité ne sera affichée."}</small>
                  </div>
                  <button
                    type="button"
                    className={product.track_stock ? styles.stockToggleActive : styles.stockToggle}
                    aria-pressed={product.track_stock}
                    onClick={() => patch(index, { track_stock: !product.track_stock })}
                  >
                    {product.track_stock ? <Check aria-hidden="true" /> : <Boxes aria-hidden="true" />}
                    {product.track_stock ? "Stock suivi" : "Suivre le stock"}
                  </button>
                  {product.track_stock && (
                    <label className={styles.stockQuantity}>
                      <span>Quantité disponible</span>
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
                      <small>unité{product.stock > 1 ? "s" : ""}</small>
                    </label>
                  )}
                </article>
              ))}
            </div>
          </Screen>
        )}
        {step === 6 && <ToggleScreen kicker="La mise en ligne" title="Sont-ils prêts à être visibles ?" subtitle="Un produit masqué reste enregistré sans apparaître sur ta vitrine." products={products} field="active" patch={patch} yes="Mettre en ligne" no="Garder en brouillon" />}
        {step === 7 && (
          <Screen kicker="Confirmation" title={<>Tout est prêt pour ta <em>boutique.</em></>} subtitle="Vérifie tes choix : après la création, Flux enchaîne sur tes horaires (inclus dans le prix).">
            <div className={styles.reviewGrid}>
              <article className={styles.reviewCard}><small>Catégorie</small><strong>{category}</strong></article>
              <article className={styles.reviewCard}><small>Produits</small><strong>{products.length} produit{products.length > 1 ? "s" : ""}</strong></article>
              {products.map((product, index) => <article className={styles.reviewCard} key={index}><small>{product.active ? "En ligne" : "Brouillon"}</small><strong>{product.name} · {(product.price_cents / 100).toLocaleString("fr-FR")} €{product.track_stock ? ` · ${product.stock} en stock` : ""}</strong></article>)}
              <article className={styles.reviewCard}><small>Coût total (produits + agenda)</small><strong>{PRODUCT_CREATE_COST} crédits · solde : {balance} cr.</strong></article>
            </div>
            {!enough && <p className={styles.subtitle}>Il te manque {PRODUCT_CREATE_COST - balance} crédit{PRODUCT_CREATE_COST - balance > 1 ? "s" : ""}. <Link href="/credits" style={{ textDecoration: "underline" }}>Recharge tes crédits</Link>.</p>}
            <div className={styles.confirm}><button className={styles.back} type="button" onClick={() => setStep(6)}><ArrowLeft aria-hidden="true" /> Modifier</button><button className={styles.primary} type="button" disabled={pending || !enough} onClick={save}>{pending ? "Création…" : `Confirmer et régler mes horaires (${PRODUCT_CREATE_COST} cr.)`} <Check aria-hidden="true" /></button></div>
          </Screen>
        )}
      </main>

      <Dialog open={creditsDialog !== null} onOpenChange={(next) => !next && setCreditsDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creditsDialog === "subscription_required"
                ? "Ton essai est terminé"
                : "Plus assez de crédits"}
            </DialogTitle>
            <DialogDescription>
              {creditsDialog === "subscription_required"
                ? "Tes 7 jours d'essai FLUX sont passés. Choisis une formule pour continuer à créer des produits."
                : `Créer tes produits coûte ${PRODUCT_CREATE_COST} crédits. Recharge tes crédits pour finaliser — rien n'est perdu.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreditsDialog(null)}>
              Plus tard
            </Button>
            <Button asChild>
              <Link href={creditsDialog === "subscription_required" ? "/formules" : "/credits"}>
                {creditsDialog === "subscription_required"
                  ? "Choisir ma formule FLUX"
                  : "Recharger mes crédits"}
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {step > 0 && step < 7 && <footer className={styles.controls}><button className={styles.back} type="button" onClick={() => setStep((current) => current - 1)}><ArrowLeft aria-hidden="true" /> Retour</button><button className={styles.primary} type="button" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>Continuer <ArrowRight aria-hidden="true" /></button></footer>}
    </div>
  );
}

function Screen({ kicker, title, subtitle, children }: { kicker: string; title: React.ReactNode; subtitle: string; children: React.ReactNode }) {
  return <section className={styles.screen}><p className={styles.kicker}>{kicker}</p><h1>{title}</h1><p className={styles.subtitle}>{subtitle}</p>{children}</section>;
}

function ProductFields({ title, kicker, subtitle, products, render }: { title: string; kicker: string; subtitle: string; products: DraftProduct[]; render: (product: DraftProduct, index: number) => React.ReactNode }) {
  return <Screen kicker={kicker} title={title} subtitle={subtitle}><div className={styles.cards}>{products.map(render)}</div></Screen>;
}

function ToggleScreen({ kicker, title, subtitle, products, field, patch, yes, no }: { kicker: string; title: string; subtitle: string; products: DraftProduct[]; field: "track_stock" | "active"; patch: (index: number, fields: Partial<DraftProduct>) => void; yes: string; no: string }) {
  return <Screen kicker={kicker} title={title} subtitle={subtitle}><div className={styles.cards}>{products.map((product, index) => <article className={styles.productRow} key={index}><div><strong>{product.name}</strong><p className={styles.subtitle}>{product[field] ? yes : no}</p></div><button type="button" aria-label={`Changer le réglage pour ${product.name}`} onClick={() => patch(index, { [field]: !product[field] })}>{product[field] ? <Check aria-hidden="true" /> : <Boxes aria-hidden="true" />}</button></article>)}</div></Screen>;
}
