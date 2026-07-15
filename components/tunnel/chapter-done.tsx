"use client";

import { ArrowRight, Check, PartyPopper } from "lucide-react";
import { JOURNEY_CHAPTERS, type JourneyChapterId } from "@/lib/journey";
import styles from "@/app/commencer/tunnel.module.css";

// Écran de célébration : on marque ce qui vient d'être acquis, en rappelant les
// étapes réellement franchies (elles viennent du Parcours partagé, pas d'une
// liste décorative).
export function ChapterDone({
  chapter,
  achievements,
  ctaLabel = "Continuer",
  onNext,
  pending = false,
}: {
  chapter: JourneyChapterId;
  achievements: string[];
  ctaLabel?: string;
  onNext: () => void;
  pending?: boolean;
}) {
  const { doneTitle, doneBody } = JOURNEY_CHAPTERS[chapter];

  return (
    <div className={styles.valueScreen}>
      <span className={styles.introIcon}>
        <PartyPopper aria-hidden="true" />
      </span>
      <p className={styles.kicker}>Chapitre {chapter} terminé</p>
      <h1>{doneTitle}</h1>
      <p className={styles.subtitle}>{doneBody}</p>
      <div className={styles.valueList}>
        {achievements.map((item) => (
          <span key={item}>
            <Check aria-hidden="true" /> {item}
          </span>
        ))}
      </div>
      <button
        className={`flux-button-smooth ${styles.primary}`}
        type="button"
        onClick={onNext}
        disabled={pending}
      >
        {pending ? "Un instant…" : ctaLabel}
        {!pending && <ArrowRight aria-hidden="true" />}
      </button>
    </div>
  );
}
