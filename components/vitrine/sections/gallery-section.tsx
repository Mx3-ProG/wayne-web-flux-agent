"use client";

import Image from "next/image";
import type { GalleryPhoto } from "@/lib/types";
import styles from "../vitrine.module.css";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";
import frStorefront from "@/lib/i18n/dictionaries/fr/storefront.json";

type Props = {
  gallery: GalleryPhoto[];
  first?: boolean;
  title?: string;
  subtitle?: string;
  t?: StorefrontDict["sections"]["gallery"];
};

export function GallerySection({ gallery, first = false, title, subtitle, t = frStorefront.sections.gallery }: Props) {
  if (gallery.length === 0) return null;
  return (
    <div className={`${styles.contentSection} ${first ? styles.firstInGroup : ""}`}>
      <div className={styles.sectionHeading}>
        <p>{t.eyebrow}</p>
        <h2>{title || t.title}</h2>
        <span>{subtitle || t.subtitle}</span>
      </div>
      <div className={styles.gallery}>
        {gallery.map((photo, i) => (
          <figure key={i}>
            <Image
              src={photo.url}
              alt={photo.title || t.photoAlt.replace("{index}", String(i + 1))}
              fill
              className={styles.galleryImage}
              sizes="(max-width: 640px) 50vw, 33vw"
            />
            {photo.title && <figcaption>{photo.title}</figcaption>}
          </figure>
        ))}
      </div>
    </div>
  );
}
