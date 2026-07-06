"use client";

import styles from "../vitrine.module.css";

type Props = {
  hoursText: string;
  fontCss: string;
  first?: boolean;
  title?: string;
  subtitle?: string;
};

export function HoursSection({ hoursText, fontCss, first = false, title, subtitle }: Props) {
  if (!hoursText) return null;
  return (
    <div className={`${styles.hours} ${first ? styles.firstInGroup : ""}`}>
      <div className={styles.sectionHeading}>
        <p>Quand venir</p>
        <h2>{title || "Mes horaires"}</h2>
        <span>{subtitle || "Retrouve-moi au bon moment."}</span>
      </div>
      <pre className={styles.hoursText} style={{ fontFamily: fontCss }}>
        {hoursText}
      </pre>
    </div>
  );
}
