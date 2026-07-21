"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/types";
import { revenueProgress } from "@/lib/revenue";
import { TrendingUp } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import styles from "./revenue-counter.module.css";

// Compteur de CA animé : monte de 0 au total au chargement, montre le palier
// atteint et la progression vers le suivant. Hook de rétention du dashboard.
export function RevenueCounter({ totalCents }: { totalCents: number }) {
  const { locale, dictionary } = useI18n();
  const t = dictionary.revenueCounter;
  const price = (cents: number) => formatPrice(cents, locale);
  const p = revenueProgress(totalCents);
  const [shown, setShown] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (totalCents <= 0) return; // rien à animer, l'état initial (0) suffit
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : 900;
    const start = performance.now();
    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setShown(Math.round(totalCents * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [totalCents]);

  return (
    <section className={styles.card} aria-label={t.aria}>
      <div className={styles.head}>
        <p className={styles.eyebrow}>
          <TrendingUp aria-hidden="true" /> {t.eyebrow}
        </p>
        {p.reached > 0 && (
          <span className={styles.badge}>
            {t.milestoneReached.replace("{amount}", price(p.reached))}
          </span>
        )}
      </div>

      <strong className={styles.amount}>{price(shown)}</strong>
      <p className={styles.caption}>{t.caption}</p>

      {p.next !== null ? (
        <div className={styles.progress}>
          <div className={styles.progressHead}>
            <span>{t.nextMilestone.replace("{amount}", price(p.next))}</span>
            <span>{p.pct}%</span>
          </div>
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${p.pct}%` }} />
          </div>
          <p className={styles.remaining}>
            {t.remaining.replace("{amount}", price(p.remaining))}
          </p>
        </div>
      ) : (
        <p className={styles.maxed}>{t.maxed}</p>
      )}
    </section>
  );
}
