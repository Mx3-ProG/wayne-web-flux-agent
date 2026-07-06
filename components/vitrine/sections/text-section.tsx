"use client";

import styles from "../vitrine.module.css";

type Props = {
  title: string;
  body: string;
  first?: boolean;
};

export function TextSection({ title, body, first = false }: Props) {
  if (!title && !body) return null;
  return (
    <div className={`${styles.contentSection} ${first ? styles.firstInGroup : ""}`}>
      {title && (
        <div className={styles.sectionHeading}>
          <h2>{title}</h2>
        </div>
      )}
      {body && (
        <div className={styles.textBody}>
          {body.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      )}
    </div>
  );
}
