"use client";

import { ExternalLink, MessageSquareMore, Star } from "lucide-react";
import vitrineStyles from "../vitrine.module.css";
import styles from "./google-business-section.module.css";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";
import frStorefront from "@/lib/i18n/dictionaries/fr/storefront.json";

type Props = {
  url: string;
  title?: string;
  description?: string;
  first?: boolean;
  t?: StorefrontDict["sections"]["googleBusiness"];
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
  t = frStorefront.sections.googleBusiness,
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
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h2>{title?.trim() || t.defaultTitle}</h2>
          <p>{description?.trim() || t.defaultDescription}</p>
        </div>
        <div className={styles.actions}>
          <a href={href} target="_blank" rel="noopener noreferrer">
            <MessageSquareMore aria-hidden="true" /> {t.leaveReview}
          </a>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.secondary}
          >
            {t.viewProfile} <ExternalLink aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
