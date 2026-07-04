"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/types";
import { revenueProgress } from "@/lib/revenue";
import { TrendingUp } from "lucide-react";
import styles from "./revenue-counter.module.css";

// Compteur de CA animé : monte de 0 au total au chargement, montre le palier
// atteint et la progression vers le suivant. Hook de rétention du dashboard.
export function RevenueCounter({ totalCents }: { totalCents: number }) {
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
    <section className={styles.card} aria-label="Chiffre d'affaires généré">
      <div className={styles.head}>
        <p className={styles.eyebrow}>
          <TrendingUp aria-hidden="true" /> Ton chiffre d&apos;affaires
        </p>
        {p.reached > 0 && (
          <span className={styles.badge}>🎉 Palier {formatPrice(p.reached)} franchi</span>
        )}
      </div>

      <strong className={styles.amount}>{formatPrice(shown)}</strong>
      <p className={styles.caption}>
        Généré via ta vitrine Wayne — rendez-vous honorés et commandes acceptées.
      </p>

      {p.next !== null ? (
        <div className={styles.progress}>
          <div className={styles.progressHead}>
            <span>
              Prochain palier : <b>{formatPrice(p.next)}</b>
            </span>
            <span>{p.pct}%</span>
          </div>
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${p.pct}%` }} />
          </div>
          <p className={styles.remaining}>
            Plus que <b>{formatPrice(p.remaining)}</b> pour y arriver 💪
          </p>
        </div>
      ) : (
        <p className={styles.maxed}>Tu exploses tous les paliers 🚀 Continue comme ça !</p>
      )}
    </section>
  );
}
