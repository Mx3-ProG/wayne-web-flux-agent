"use client";

import Image from "next/image";
import type { Offer } from "@/lib/types";
import { formatPrice } from "@/lib/types";
import { Tag } from "lucide-react";
import styles from "../vitrine.module.css";

const OFFER_KIND_LABEL: Record<Offer["kind"], string> = {
  produit: "Produit",
  service: "Service",
  evenement: "Événement",
};

type Props = {
  offers: Offer[]; // offres actives uniquement
  accent: string;
  onAddOffer?: (offer: Offer) => void;
  title?: string;
  subtitle?: string;
};

export function OffersSection({ offers, accent, onAddOffer, title, subtitle }: Props) {
  if (offers.length === 0) return null;
  return (
    <section className={styles.offers} id="offres">
      <div className={styles.sectionHeading}>
        <p>À ne pas manquer</p>
        <h2>{title || "Mes offres"}</h2>
        <span>{subtitle || "Des offres à saisir maintenant."}</span>
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
                      {offer.kind === "produit" ? "Commander" : "J'en profite"}
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
