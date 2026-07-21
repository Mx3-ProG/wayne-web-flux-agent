"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  BillingAddressElement,
  CheckoutElementsProvider,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import { Check, LockKeyhole, ShieldCheck } from "lucide-react";
import type { BillingDict } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import styles from "./custom-checkout.module.css";

// Stripe résout sa propre langue d'affichage (Elements) indépendamment du
// dashboard : on la fait suivre la locale du compte plutôt que la détection
// navigateur par défaut. "auto" en repli si Stripe ne supporte pas la langue.
const STRIPE_LOCALE: Record<Locale, string> = {
  fr: "fr", en: "en", es: "es", de: "de", it: "it", ru: "ru", zh: "zh", ja: "ja", ar: "ar",
};

type CheckoutProduct = {
  kind: "subscription" | "credits";
  id: string;
  title: string;
  subtitle: string;
  price: string;
  cadence?: string;
  features: string[];
};

function PaymentForm({ product, t }: { product: CheckoutProduct; t: BillingDict["checkout"] }) {
  const state = useCheckoutElements();
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!accepted) return setMessage(t.acceptTermsRequired);
    if (state.type !== "success") return;
    setSubmitting(true);
    setMessage(null);
    const result = await state.checkout.confirm();
    if (result.type === "error") {
      setMessage(result.error.message || t.paymentNotConfirmed);
      setSubmitting(false);
      return;
    }
    router.push(`/paiement/confirmation?session_id=${result.session.id}`);
  }

  if (state.type === "loading") return <div className={styles.loading}>{t.preparingPayment}</div>;
  if (state.type === "error") return <div className={styles.error}>{state.error.message}</div>;

  return (
    <form onSubmit={submit} className={styles.paymentForm}>
      <div className={styles.block}><h2>{t.billingInfoTitle}</h2><BillingAddressElement options={{ display: { name: "split" } }} /></div>
      <div className={styles.block}><h2>{t.paymentMethodTitle}</h2><PaymentElement options={{ layout: { type: "accordion", defaultCollapsed: false }, terms: { card: "never" } }} /></div>
      <label className={styles.consent}>
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
        <span>
          {t.consentPrefix} <Link href="/cgv" target="_blank">{t.consentTerms}</Link>{" "}
          {t.consentSuffix.replace(
            "{clause}",
            product.kind === "subscription" ? t.consentSubscription : t.consentCredits
          )}
        </span>
      </label>
      {message && <p className={styles.formError} role="alert">{message}</p>}
      <button className={`flux-button-smooth ${styles.payButton}`} disabled={submitting || !state.checkout.canConfirm} type="submit">
        <LockKeyhole aria-hidden="true" />
        {submitting ? t.confirming : t.payButton.replace("{price}", product.price).replace("{cadence}", product.cadence ?? "")}
      </button>
      <p className={styles.secure}><ShieldCheck aria-hidden="true" /> {t.securityNote}</p>
    </form>
  );
}

export function CustomCheckout({
  product,
  publishableKey,
  locale,
  t,
}: {
  product: CheckoutProduct;
  publishableKey: string;
  locale: Locale;
  t: BillingDict["checkout"];
}) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);
  const clientSecret = useMemo(() => fetch("/api/checkout/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: product.kind, id: product.id }),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok || !data.clientSecret) throw new Error(data.error || t.paymentUnavailable);
      return data.clientSecret as string;
    }), [product.kind, product.id, t.paymentUnavailable]);
  const options = useMemo(() => ({
    clientSecret,
    elementsOptions: {
      locale: STRIPE_LOCALE[locale],
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
  }), [clientSecret, locale]);

  return (
    <div className={styles.page}>
      <header><Link href={product.kind === "subscription" ? "/formules" : "/credits"}>← {t.back}</Link><span><LockKeyhole /> {t.securePayment}</span></header>
      <main>
        <aside className={styles.summary}>
          <p className={styles.eyebrow}>{product.kind === "subscription" ? t.planEyebrow : t.creditsEyebrow}</p>
          <h1>{product.title}</h1><p>{product.subtitle}</p>
          <strong>{product.price}<small>{product.cadence}</small></strong>
          <ul>{product.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul>
          <div className={styles.total}><span>{t.totalToday}</span><strong>{product.price}</strong></div>
          {product.kind === "subscription" && (
            <small className={styles.renewal}>
              {t.thenLabel.replace("{price}", product.price).replace("{cadence}", product.cadence ?? "")}
            </small>
          )}
        </aside>
        <section className={styles.formPanel}>
          <CheckoutElementsProvider stripe={stripePromise} options={options}>
            <PaymentForm product={product} t={t} />
          </CheckoutElementsProvider>
        </section>
      </main>
    </div>
  );
}
