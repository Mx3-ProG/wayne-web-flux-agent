"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock3, Globe2, RotateCcw, Search, Users } from "lucide-react";
import styles from "@/app/home.module.css";
import type { LandingDict } from "@/lib/i18n/get-dictionary";

const PILLAR_META = [
  { number: "01", icon: Clock3 },
  { number: "02", icon: Search },
  { number: "03", icon: Users },
  { number: "04", icon: Globe2 },
];

export function PillarGrid({
  dict,
  pillars,
}: {
  dict: LandingDict["pillarsSection"];
  pillars: LandingDict["pillars"];
}) {
  const [flipped, setFlipped] = useState<string[]>([]);

  function toggle(number: string) {
    setFlipped((current) =>
      current.includes(number)
        ? current.filter((item) => item !== number)
        : [...current, number]
    );
  }

  return (
    <div className={styles.pillarGrid}>
      {pillars.map((pillar, index) => {
        const meta = PILLAR_META[index] ?? PILLAR_META[0];
        const Icon = meta.icon;
        const isFlipped = flipped.includes(meta.number);

        return (
          <article
            key={meta.number}
            className={`${styles.pillar} ${isFlipped ? styles.pillarFlipped : ""}`}
          >
            <div className={styles.pillarInner}>
              <button
                className={styles.pillarFront}
                type="button"
                onClick={() => toggle(meta.number)}
                aria-label={`${pillar.title}. ${dict.showMoreAria}`}
                aria-expanded={isFlipped}
                tabIndex={isFlipped ? -1 : 0}
              >
                <span className={styles.pillarTop}>
                  <span>{meta.number}</span>
                  <Icon aria-hidden="true" />
                </span>
                <span className={styles.pillarContent}>
                  <span className={styles.pillarTag}>{pillar.tag}</span>
                  <strong>{pillar.title}</strong>
                  <span>{pillar.text}</span>
                </span>
                <small>{dict.flipHint}</small>
              </button>

              <div className={styles.pillarBack} aria-hidden={!isFlipped}>
                <span className={styles.pillarBackIcon}><Icon aria-hidden="true" /></span>
                <p>{pillar.sales}</p>
                <Link href="/commencer" tabIndex={isFlipped ? 0 : -1}>
                  {dict.flipCta} <span>→</span>
                </Link>
                <button type="button" tabIndex={isFlipped ? 0 : -1} onClick={() => toggle(meta.number)}>
                  <RotateCcw aria-hidden="true" /> {dict.flipBack}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
