"use client";

import { ExternalLink, MessageSquareMore, Star } from "lucide-react";
import vitrineStyles from "../vitrine.module.css";
import styles from "./google-business-section.module.css";

type Props = {
  url: string;
  title?: string;
  description?: string;
  first?: boolean;
};

function safeGoogleUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const hosts = ["google.com", "google.fr", "goo.gl", "g.page"];
    const allowed = hosts.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
    );
    return url.protocol === "https:" && allowed ? url.toString() : null;
  } catch {
    return null;
  }
}

export function GoogleBusinessSection({
  url,
  title,
  description,
  first = false,
}: Props) {
  const href = safeGoogleUrl(url);
  if (!href) return null;

  return (
    <div
      className={`${vitrineStyles.contentSection} ${
        first ? vitrineStyles.firstInGroup : ""
      }`}
    >
      <div className={styles.card}>
        <div className={styles.icon} aria-hidden="true">
          <Star />
        </div>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Avis Google</p>
          <h2>{title?.trim() || "Ton avis compte pour nous"}</h2>
          <p>
            {description?.trim() ||
              "Consulte les avis de nos clients ou partage ton expérience en quelques secondes."}
          </p>
        </div>
        <div className={styles.actions}>
          <a href={href} target="_blank" rel="noopener noreferrer">
            <MessageSquareMore aria-hidden="true" /> Laisser un avis
          </a>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.secondary}
          >
            Voir la fiche Google <ExternalLink aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
