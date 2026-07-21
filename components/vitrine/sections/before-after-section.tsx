"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "../vitrine.module.css";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";
import frStorefront from "@/lib/i18n/dictionaries/fr/storefront.json";

type Props = {
  beforeUrl: string | null;
  afterUrl: string | null;
  caption?: string;
  first?: boolean;
  t?: StorefrontDict["sections"]["beforeAfter"];
};

// Comparateur avant/après : l'image « après » est rognée par un clip-path
// piloté par un input range transparent posé au-dessus. Zéro dépendance.
export function BeforeAfterSection({ beforeUrl, afterUrl, caption, first = false, t = frStorefront.sections.beforeAfter }: Props) {
  const [position, setPosition] = useState(50);
  if (!beforeUrl || !afterUrl) return null;
  return (
    <div className={`${styles.contentSection} ${first ? styles.firstInGroup : ""}`}>
      <div className={styles.sectionHeading}>
        <p>{t.eyebrow}</p>
        <h2>{t.title}</h2>
        {caption && <span>{caption}</span>}
      </div>
      <div className={styles.baWrap}>
        <Image
          src={beforeUrl}
          alt={t.before}
          fill
          className={styles.galleryImage}
          sizes="(max-width: 640px) 100vw, 66vw"
        />
        <div
          className={styles.baAfter}
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        >
          <Image
            src={afterUrl}
            alt={t.after}
            fill
            className={styles.galleryImage}
            sizes="(max-width: 640px) 100vw, 66vw"
          />
        </div>
        <div className={styles.baHandle} style={{ left: `${position}%` }} />
        <span className={`${styles.baTag} ${styles.baTagLeft}`}>{t.before}</span>
        <span className={`${styles.baTag} ${styles.baTagRight}`}>{t.after}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
          className={styles.baRange}
          aria-label={t.compareAria}
        />
      </div>
    </div>
  );
}
