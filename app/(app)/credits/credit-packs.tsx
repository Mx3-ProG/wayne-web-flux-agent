import Link from "next/link";
import { Coins } from "lucide-react";
import { CREDIT_PACKS, packUnitPrice } from "@/lib/credit-packs";
import styles from "./credits.module.css";
import type { BillingDict } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";

// Cartes d'achat de packs de crédits → Stripe Checkout.
// Le crédit effectif est posé par le webhook, pas au retour de redirection.
export function CreditPacks({ t, locale }: { t: BillingDict["credits"]["packs"]; locale: Locale }) {
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
            {formatNumber(locale, pack.priceCents / 100)} €
            <span>
              {" "}
              · {packUnitPrice(pack, locale)} €/cr
            </span>
          </p>
          <Link
            href={`/checkout/credits/${pack.id}`}
            className={`flux-button-smooth flux-button-smooth-gold ${pack.featured ? styles.buyFeatured : styles.buyButton}`}
          >
            <Coins aria-hidden="true" />
            {t.buy}
          </Link>
        </article>
      ))}
    </div>
  );
}
