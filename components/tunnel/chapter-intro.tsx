"use client";

import { ArrowRight, TriangleAlert } from "lucide-react";
import { JOURNEY_CHAPTERS, type JourneyChapterId } from "@/lib/journey";
import styles from "@/app/commencer/tunnel.module.css";

// Écran-charnière : avant chaque chapitre, on nomme l'enjeu concret plutôt que
// d'enchaîner les formulaires. C'est ce qui fait la différence entre « remplir
// des champs » et « comprendre pourquoi on le fait ».
export function ChapterIntro({
  chapter,
  onNext,
}: {
  chapter: JourneyChapterId;
  onNext: () => void;
}) {
  const { title, whyTitle, whyBody } = JOURNEY_CHAPTERS[chapter];

  return (
    <div className={styles.intro}>
      <span className={styles.introIcon}>
        <TriangleAlert aria-hidden="true" />
      </span>
      <p className={styles.kicker}>
        Chapitre {chapter} · {title}
      </p>
      <h1>{whyTitle}</h1>
      <p>{whyBody}</p>
      <button className={`flux-button-smooth ${styles.primary}`} type="button" onClick={onNext}>
        J&apos;y vais <ArrowRight aria-hidden="true" />
      </button>
    </div>
  );
}
