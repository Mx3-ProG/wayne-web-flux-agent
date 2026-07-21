"use client";

import styles from "../vitrine.module.css";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";
import frStorefront from "@/lib/i18n/dictionaries/fr/storefront.json";

type Props = {
  fallbackQuery: string; // adresse + ville de la page
  first?: boolean;
  t?: StorefrontDict["sections"]["map"];
};

// Carte Google Maps embarquée (iframe publique, sans clé API), cliquable
// vers l'itinéraire.
export function MapSection({ fallbackQuery, first = false, t = frStorefront.sections.map }: Props) {
  const q = fallbackQuery.trim();
  if (!q) return null;
  const embed = `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
  return (
    <div className={`${styles.contentSection} ${first ? styles.firstInGroup : ""}`}>
      <div className={styles.sectionHeading}>
        <p>{t.eyebrow}</p>
        <h2>{t.title}</h2>
      </div>
      <div className={styles.mapEmbed}>
        <iframe
          src={embed}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          title={t.mapTitle.replace("{query}", q)}
        />
      </div>
    </div>
  );
}
