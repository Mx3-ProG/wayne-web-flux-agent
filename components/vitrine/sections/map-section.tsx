"use client";

import styles from "../vitrine.module.css";

type Props = {
  query?: string;
  fallbackQuery: string; // adresse + ville de la page
  first?: boolean;
};

// Carte Google Maps embarquée (iframe publique, sans clé API), cliquable
// vers l'itinéraire.
export function MapSection({ query, fallbackQuery, first = false }: Props) {
  const q = (query || fallbackQuery).trim();
  if (!q) return null;
  const embed = `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
  return (
    <div className={`${styles.contentSection} ${first ? styles.firstInGroup : ""}`}>
      <div className={styles.sectionHeading}>
        <p>Où me trouver</p>
        <h2>Venir me voir</h2>
      </div>
      <div className={styles.mapEmbed}>
        <iframe
          src={embed}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          title={`Carte : ${q}`}
        />
      </div>
    </div>
  );
}
