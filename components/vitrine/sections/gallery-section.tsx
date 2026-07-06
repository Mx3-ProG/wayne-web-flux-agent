"use client";

import Image from "next/image";
import type { GalleryPhoto } from "@/lib/types";
import styles from "../vitrine.module.css";

type Props = {
  gallery: GalleryPhoto[];
  first?: boolean;
  title?: string;
  subtitle?: string;
};

export function GallerySection({ gallery, first = false, title, subtitle }: Props) {
  if (gallery.length === 0) return null;
  return (
    <div className={`${styles.contentSection} ${first ? styles.firstInGroup : ""}`}>
      <div className={styles.sectionHeading}>
        <p>En images</p>
        <h2>{title || "Mon travail"}</h2>
        <span>{subtitle || "Quelques détails qui racontent mon univers."}</span>
      </div>
      <div className={styles.gallery}>
        {gallery.map((photo, i) => (
          <figure key={i}>
            <Image
              src={photo.url}
              alt={photo.title || `Photo ${i + 1}`}
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
