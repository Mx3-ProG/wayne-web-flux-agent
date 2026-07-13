"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Coins } from "lucide-react";
import { CREDIT_PACKS, packUnitPrice } from "@/lib/credit-packs";
import { createCheckoutSession } from "./actions";
import styles from "./credits.module.css";

// Cartes d'achat de packs de crédits → Stripe Checkout.
// Le crédit effectif est posé par le webhook, pas au retour de redirection.
export function CreditPacks() {
  const [pendingPack, setPendingPack] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function buy(packId: string) {
    setPendingPack(packId);
    startTransition(async () => {
      const result = await createCheckoutSession(packId);
      if (result.error || !result.url) {
        toast.info(result.error ?? "Paiement indisponible. Réessaie.");
        setPendingPack(null);
        return;
      }
      window.location.assign(result.url);
    });
  }

  return (
    <div className={styles.packGrid}>
      {CREDIT_PACKS.map((pack) => (
        <article
          key={pack.id}
          className={pack.featured ? styles.packFeatured : styles.pack}
        >
          {pack.discountLabel && (
            <span className={styles.discount}>
              {pack.discountLabel}
            </span>
          )}
          <p className={styles.packLabel}>
            {pack.label}
          </p>
          <p className={styles.packCredits}>
            {pack.credits}
            <span> cr.</span>
          </p>
          <p className={styles.packPrice}>
            {(pack.priceCents / 100).toLocaleString("fr-FR")} €
            <span>
              {" "}
              · {packUnitPrice(pack)} €/cr
            </span>
          </p>
          <button
            type="button"
            className={pack.featured ? styles.buyFeatured : styles.buyButton}
            disabled={pendingPack !== null}
            onClick={() => buy(pack.id)}
          >
            <Coins aria-hidden="true" />
            {pendingPack === pack.id ? "Redirection…" : "Acheter"}
          </button>
        </article>
      ))}
    </div>
  );
}
