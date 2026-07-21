"use client";

import { useEffect, useState } from "react";
import type { Page } from "@/lib/types";
import styles from "../vitrine.module.css";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";
import frStorefront from "@/lib/i18n/dictionaries/fr/storefront.json";

function remainingLabel(
  endsAt: string,
  now: number,
  t: StorefrontDict["sections"]["promo"]
): string | null {
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(end)) return null;
  const diff = end - now;
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  if (days > 0) return t.remainingDays.replace("{days}", String(days)).replace("{hours}", String(hours));
  if (hours > 0)
    return t.remainingHours
      .replace("{hours}", String(hours))
      .replace("{minutes}", String(minutes).padStart(2, "0"));
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Bandeau promo en haut de page. Lit le nouveau format `promo` (compte à
// rebours + code copiable) avec fallback sur l'ancienne colonne texte `offer`.
// Le countdown n'est calculé qu'après montage (pas de mismatch SSR).
export function PromoBanner({
  page,
  accent,
  t = frStorefront.sections.promo,
}: {
  page: Page;
  accent: string;
  t?: StorefrontDict["sections"]["promo"];
}) {
  const promo = page.promo ?? (page.offer ? { text: page.offer } : null);
  const [now, setNow] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const hasCountdown = Boolean(promo?.endsAt);
  useEffect(() => {
    if (!hasCountdown) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [hasCountdown]);

  if (!promo?.text) return null;

  let countdown: string | null = null;
  if (promo.endsAt && now !== null) {
    countdown = remainingLabel(promo.endsAt, now, t);
    // Offre expirée : le bandeau disparaît côté client.
    if (countdown === null) return null;
  }

  async function copyCode() {
    if (!promo?.code) return;
    try {
      await navigator.clipboard.writeText(promo.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className={styles.offer} style={{ backgroundColor: accent }}>
      <span>{promo.text}</span>
      {countdown && (
        <span className={styles.offerCountdown}>
          {t.countdownPrefix.replace("{countdown}", countdown)}
        </span>
      )}
      {promo.code && (
        <button type="button" className={styles.offerCode} onClick={copyCode}>
          {copied ? t.codeCopied : t.codeLabel.replace("{code}", promo.code)}
        </button>
      )}
    </div>
  );
}
