"use client";

import Image from "next/image";
import styles from "../vitrine.module.css";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";
import frStorefront from "@/lib/i18n/dictionaries/fr/storefront.json";

type Props = {
  photoUrl: string | null;
  title: string;
  body: string;
  first?: boolean;
  t?: StorefrontDict["sections"]["about"];
};

export function AboutSection({ photoUrl, title, body, first = false, t = frStorefront.sections.about }: Props) {
  if (!photoUrl && !title && !body) return null;
  return (
    <div className={`${styles.contentSection} ${first ? styles.firstInGroup : ""}`}>
      <div className={styles.about}>
        {photoUrl && (
          <div className={styles.aboutPhoto}>
            <Image
              src={photoUrl}
              alt={title || t.defaultAlt}
              fill
              className={styles.galleryImage}
              sizes="(max-width: 640px) 100vw, 33vw"
            />
          </div>
        )}
        <div className={styles.aboutBody}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          {title && <h2>{title}</h2>}
          {body &&
            body.split("\n\n").map((paragraph, i) => <p key={i}>{paragraph}</p>)}
        </div>
      </div>
    </div>
  );
}
