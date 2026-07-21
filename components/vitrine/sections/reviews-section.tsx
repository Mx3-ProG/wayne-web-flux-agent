"use client";

import type { Review } from "@/lib/types";
import styles from "../vitrine.module.css";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";
import frStorefront from "@/lib/i18n/dictionaries/fr/storefront.json";

type Props = {
  reviews: Review[];
  first?: boolean;
  title?: string;
  subtitle?: string;
  t?: StorefrontDict["sections"]["reviews"];
};

export function ReviewsSection({ reviews, first = false, title, subtitle, t = frStorefront.sections.reviews }: Props) {
  if (reviews.length === 0) return null;
  return (
    <div className={`${styles.contentSection} ${first ? styles.firstInGroup : ""}`}>
      <div className={styles.sectionHeading}>
        <p>{t.eyebrow}</p>
        <h2>{title || t.title}</h2>
        <span>{subtitle || t.subtitle}</span>
      </div>
      <div className={styles.reviews}>
        {reviews.map((review, i) => {
          const rating = Math.min(5, Math.max(1, review.rating ?? 5));
          return (
            <blockquote key={i} className={styles.review}>
              <p className={styles.stars}>
                {"★".repeat(rating)}
                {"☆".repeat(5 - rating)}
              </p>
              <p>« {review.text} »</p>
              <footer>{review.author}</footer>
            </blockquote>
          );
        })}
      </div>
    </div>
  );
}
