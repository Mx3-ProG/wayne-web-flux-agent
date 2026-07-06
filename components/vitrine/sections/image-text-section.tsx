"use client";

import Image from "next/image";
import styles from "../vitrine.module.css";

type Props = {
  imageUrl: string | null;
  title: string;
  body: string;
  imageSide: "left" | "right";
  first?: boolean;
};

export function ImageTextSection({ imageUrl, title, body, imageSide, first = false }: Props) {
  if (!imageUrl && !title && !body) return null;
  return (
    <div className={`${styles.contentSection} ${first ? styles.firstInGroup : ""}`}>
      <div
        className={`${styles.imageText} ${imageSide === "right" ? styles.imageTextRight : ""}`}
      >
        {imageUrl && (
          <div className={styles.imageTextImage}>
            <Image
              src={imageUrl}
              alt={title || ""}
              fill
              className={styles.galleryImage}
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          </div>
        )}
        <div className={styles.imageTextBody}>
          {title && <h2>{title}</h2>}
          {body &&
            body.split("\n\n").map((paragraph, i) => <p key={i}>{paragraph}</p>)}
        </div>
      </div>
    </div>
  );
}
