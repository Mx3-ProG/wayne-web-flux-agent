"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  BillingAddressElement,
  CheckoutElementsProvider,
  PaymentElement,
  TaxIdElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import { Check, LockKeyhole, ShieldCheck } from "lucide-react";
import styles from "./custom-checkout.module.css";

type CheckoutProduct = {
  kind: "subscription" | "credits";
  id: string;
  title: string;
  subtitle: string;
  price: string;
  cadence?: string;
  features: string[];
};

function PaymentForm({ product }: { product: CheckoutProduct }) {
  const state = useCheckoutElements();
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!accepted) return setMessage("Accepte les conditions générales pour continuer.");
    if (state.type !== "success") return;
    setSubmitting(true);
    setMessage(null);
    const result = await state.checkout.confirm();
    if (result.type === "error") {
      setMessage(result.error.message || "Le paiement n’a pas pu être confirmé.");
      setSubmitting(false);
      return;
    }
    router.push(`/paiement/confirmation?session_id=${result.session.id}`);
  }

  if (state.type === "loading") return <div className={styles.loading}>Préparation du paiement sécurisé…</div>;
  if (state.type === "error") return <div className={styles.error}>{state.error.message}</div>;

  return (
    <form onSubmit={submit} className={styles.paymentForm}>
      <div className={styles.block}><h2>Informations de facturation</h2><BillingAddressElement options={{ display: { name: "split" } }} /></div>
      <div className={styles.block}><h2>TVA professionnelle <small>facultatif</small></h2><TaxIdElement options={{ visibility: "auto", fields: { businessName: "auto" } }} /></div>
      <div className={styles.block}><h2>Moyen de paiement</h2><PaymentElement options={{ layout: { type: "accordion", defaultCollapsed: false }, terms: { card: "never" } }} /></div>
      <label className={styles.consent}>
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
        <span>J’accepte les <Link href="/cgv" target="_blank">conditions générales</Link> et reconnais {product.kind === "subscription" ? "le renouvellement mensuel jusqu’à résiliation" : "l’achat immédiat du pack de crédits"}.</span>
      </label>
      {message && <p className={styles.formError} role="alert">{message}</p>}
      <button className={`flux-button-smooth ${styles.payButton}`} disabled={submitting || !state.checkout.canConfirm} type="submit">
        <LockKeyhole aria-hidden="true" />
        {submitting ? "Confirmation…" : `Payer ${product.price}${product.cadence ?? ""}`}
      </button>
      <p className={styles.secure}><ShieldCheck aria-hidden="true" /> Paiement chiffré et sécurisé par Stripe. FLUX ne voit jamais les données de ta carte.</p>
    </form>
  );
}

export function CustomCheckout({ product, publishableKey }: { product: CheckoutProduct; publishableKey: string }) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);
  const clientSecret = useMemo(() => fetch("/api/checkout/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: product.kind, id: product.id }),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok || !data.clientSecret) throw new Error(data.error || "Paiement indisponible.");
      return data.clientSecret as string;
    }), [product.kind, product.id]);
  const options = useMemo(() => ({
    clientSecret,
    elementsOptions: {
      appearance: {
        theme: "night" as const,
        inputs: "spaced" as const,
        labels: "above" as const,
        variables: {
          colorPrimary: "#ef233c",
          colorBackground: "#131316",
          colorText: "#f7f5f2",
          colorTextSecondary: "#aaa7a8",
          colorDanger: "#ff6378",
          borderRadius: "14px",
          spacingUnit: "5px",
          fontFamily: "Inter, system-ui, sans-serif",
        },
        rules: {
          ".Input": { border: "1px solid rgba(255,255,255,.12)", boxShadow: "none" },
          ".Input:focus": { borderColor: "#ff6378", boxShadow: "0 0 0 2px rgba(239,35,60,.16)" },
          ".Tab": { border: "1px solid rgba(255,255,255,.12)" },
        },
      },
    },
  }), [clientSecret]);

  return (
    <div className={styles.page}>
      <header><Link href={product.kind === "subscription" ? "/formules" : "/credits"}>← Retour</Link><span><LockKeyhole /> Paiement sécurisé</span></header>
      <main>
        <aside className={styles.summary}>
          <p className={styles.eyebrow}>{product.kind === "subscription" ? "Formule FLUX" : "Recharge FLUX"}</p>
          <h1>{product.title}</h1><p>{product.subtitle}</p>
          <strong>{product.price}<small>{product.cadence}</small></strong>
          <ul>{product.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul>
          <div className={styles.total}><span>Total aujourd’hui</span><strong>{product.price}</strong></div>
          {product.kind === "subscription" && <small className={styles.renewal}>Puis {product.price}{product.cadence}, résiliable depuis ton espace.</small>}
        </aside>
        <section className={styles.formPanel}>
          <CheckoutElementsProvider stripe={stripePromise} options={options}>
            <PaymentForm product={product} />
          </CheckoutElementsProvider>
        </section>
      </main>
    </div>
  );
}
