"use client";

import { ArrowRight, TriangleAlert } from "lucide-react";
import { type JourneyChapterId } from "@/lib/journey";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";
import styles from "@/app/commencer/tunnel.module.css";

// Écran-charnière : avant chaque chapitre, on nomme l'enjeu concret plutôt que
// d'enchaîner les formulaires. C'est ce qui fait la différence entre « remplir
// des champs » et « comprendre pourquoi on le fait ».
export function ChapterIntro({
  dict,
  content,
  chapter,
  onNext,
}: {
  dict: TunnelDict["chapterIntro"];
  content: TunnelDict["chapters"]["1"];
  chapter: JourneyChapterId;
  onNext: () => void;
}) {
  const { title, whyTitle, whyBody } = content;

  return (
    <div className={styles.intro}>
      <span className={styles.introIcon}>
        <TriangleAlert aria-hidden="true" />
      </span>
      <p className={styles.kicker}>{dict.kicker.replace("{chapter}", String(chapter)).replace("{title}", title)}</p>
      <h1>{whyTitle}</h1>
      <p>{whyBody}</p>
      <button className={`flux-button-smooth ${styles.primary}`} type="button" onClick={onNext}>
        {dict.cta} <ArrowRight aria-hidden="true" />
      </button>
    </div>
  );
}
