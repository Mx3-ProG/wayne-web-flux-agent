"use client";

import styles from "../vitrine.module.css";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";
import frStorefront from "@/lib/i18n/dictionaries/fr/storefront.json";

type Props = {
  hoursText: string;
  fontCss: string;
  first?: boolean;
  title?: string;
  subtitle?: string;
  t?: StorefrontDict["sections"]["hours"];
};

export function HoursSection({ hoursText, fontCss, first = false, title, subtitle, t = frStorefront.sections.hours }: Props) {
  if (!hoursText) return null;
  return (
    <div className={`${styles.hours} ${first ? styles.firstInGroup : ""}`}>
      <div className={styles.sectionHeading}>
        <p>{t.eyebrow}</p>
        <h2>{title || t.title}</h2>
        <span>{subtitle || t.subtitle}</span>
      </div>
      <pre className={styles.hoursText} style={{ fontFamily: fontCss }}>
        {hoursText}
      </pre>
    </div>
  );
}
