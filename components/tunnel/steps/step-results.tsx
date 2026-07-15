"use client";

import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";

// Étape 7 : aucun signal en base ne dit « j'ai compris mes chiffres ». Elle est
// validée à la main via completeJourneyStep(7), comme sur le dashboard.
export function StepResults({
  balance,
  generationCount,
  upcomingBookings,
  gain,
}: {
  balance: number;
  generationCount: number;
  upcomingBookings: number;
  gain: string;
}) {
  return (
    <Question
      kicker="Étape 7 · Tes résultats"
      title={<>Voilà où tu en es <em>vraiment.</em></>}
      subtitle="Ce sont tes vrais chiffres, pas une démo. C'est ce tableau que tu retrouveras chaque matin dans ton espace."
      gain={gain}
    >
      <div className={styles.resultGrid}>
        <div className={styles.resultCard}>
          <strong>{balance}</strong>
          <span>crédits restants</span>
          <small>Chaque contenu, chaque publication en consomme.</small>
        </div>
        <div className={styles.resultCard}>
          <strong>{generationCount}</strong>
          <span>
            création{generationCount > 1 ? "s" : ""} dans ton coffre
          </span>
          <small>Tes contenus restent accessibles pour toujours.</small>
        </div>
        <div className={styles.resultCard}>
          <strong>{upcomingBookings}</strong>
          <span>rendez-vous à venir</span>
          <small>Il montera tout seul dès que ton lien circulera.</small>
        </div>
      </div>
    </Question>
  );
}
