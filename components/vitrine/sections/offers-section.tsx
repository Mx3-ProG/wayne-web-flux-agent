"use client";

import Image from "next/image";
import type { Offer } from "@/lib/types";
import { formatPrice } from "@/lib/types";
import { Tag } from "lucide-react";
import styles from "../vitrine.module.css";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";
import frStorefront from "@/lib/i18n/dictionaries/fr/storefront.json";

type Props = {
  offers: Offer[]; // offres actives uniquement
  accent: string;
  onAddOffer?: (offer: Offer) => void;
  title?: string;
  subtitle?: string;
  t?: StorefrontDict["sections"]["offers"];
};

export function OffersSection({ offers, accent, onAddOffer, title, subtitle, t = frStorefront.sections.offers }: Props) {
  if (offers.length === 0) return null;
  const OFFER_KIND_LABEL: Record<Offer["kind"], string> = {
    produit: t.kindProduit,
    service: t.kindService,
    evenement: t.kindEvenement,
  };
  return (
    <section className={styles.offers} id="offres">
      <div className={styles.sectionHeading}>
        <p>{t.eyebrow}</p>
        <h2>{title || t.title}</h2>
        <span>{subtitle || t.subtitle}</span>
      </div>
      <div className={styles.offersGrid}>
        {offers.map((offer) => {
          const promo =
            offer.compare_at_cents != null &&
            offer.compare_at_cents > offer.price_cents;
          return (
            <article key={offer.id} className={styles.offerCard}>
              {offer.image_url && (
                <div className={styles.offerImage}>
                  <Image
                    src={offer.image_url}
                    alt={offer.title}
                    fill
                    className={styles.galleryImage}
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                </div>
              )}
              <div className={styles.offerBody}>
                <span className={styles.offerKind}>
                  <Tag aria-hidden="true" /> {OFFER_KIND_LABEL[offer.kind]}
                </span>
                <h3 className={styles.offerTitle}>{offer.title}</h3>
                {offer.description && (
                  <p className={styles.offerDesc}>{offer.description}</p>
                )}
                <div className={styles.offerFoot}>
                  <span className={styles.offerPrice}>
                    {promo && (
                      <s className={styles.offerCompare}>
                        {formatPrice(offer.compare_at_cents!)}
                      </s>
                    )}
                    {formatPrice(offer.price_cents)}
                  </span>
                  {onAddOffer && (
                    <button
                      type="button"
                      onClick={() => onAddOffer(offer)}
                      className={styles.addButton}
                      style={{ backgroundColor: accent }}
                    >
                      {offer.kind === "produit" ? t.orderProduct : t.grabOffer}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
