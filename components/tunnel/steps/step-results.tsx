"use client";

import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";

// Étape 7 : aucun signal en base ne dit « j'ai compris mes chiffres ». Elle est
// validée à la main via completeJourneyStep(7), comme sur le dashboard.
export function StepResults({
  dict,
  balance,
  generationCount,
  upcomingBookings,
  gain,
}: {
  dict: TunnelDict["results"];
  balance: number;
  generationCount: number;
  upcomingBookings: number;
  gain: string;
}) {
  return (
    <Question
      kicker={dict.kicker}
      title={<>{dict.titleStart} <em>{dict.titleEm}</em></>}
      subtitle={dict.subtitle}
      gain={gain}
    >
      <div className={styles.resultGrid}>
        <div className={styles.resultCard}>
          <strong>{balance}</strong>
          <span>{dict.creditsLeft}</span><small>{dict.creditsLeftHint}</small>
        </div>
        <div className={styles.resultCard}>
          <strong>{generationCount}</strong>
          <span>
            {generationCount === 1 ? dict.creation : dict.creations}
          </span>
          <small>{dict.creationsHint}</small>
        </div>
        <div className={styles.resultCard}>
          <strong>{upcomingBookings}</strong>
          <span>{dict.upcomingBookings}</span><small>{dict.upcomingBookingsHint}</small>
        </div>
      </div>
    </Question>
  );
}
