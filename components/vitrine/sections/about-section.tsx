"use client";

import Image from "next/image";
import styles from "../vitrine.module.css";

type Props = {
  photoUrl: string | null;
  title: string;
  body: string;
  first?: boolean;
};

export function AboutSection({ photoUrl, title, body, first = false }: Props) {
  if (!photoUrl && !title && !body) return null;
  return (
    <div className={`${styles.contentSection} ${first ? styles.firstInGroup : ""}`}>
      <div className={styles.about}>
        {photoUrl && (
          <div className={styles.aboutPhoto}>
            <Image
              src={photoUrl}
              alt={title || "Portrait"}
              fill
              className={styles.galleryImage}
              sizes="(max-width: 640px) 100vw, 33vw"
            />
          </div>
        )}
        <div className={styles.aboutBody}>
          <p className={styles.eyebrow}>Mon histoire</p>
          {title && <h2>{title}</h2>}
          {body &&
            body.split("\n\n").map((paragraph, i) => <p key={i}>{paragraph}</p>)}
        </div>
      </div>
    </div>
  );
}
