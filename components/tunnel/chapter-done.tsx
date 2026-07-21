"use client";

import { ArrowRight, Check, PartyPopper } from "lucide-react";
import { type JourneyChapterId } from "@/lib/journey";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";
import styles from "@/app/commencer/tunnel.module.css";

// Écran de célébration : on marque ce qui vient d'être acquis, en rappelant les
// étapes réellement franchies (elles viennent du Parcours partagé, pas d'une
// liste décorative).
export function ChapterDone({
  dict,
  content,
  chapter,
  achievements,
  ctaLabel,
  onNext,
  pending = false,
}: {
  dict: TunnelDict["chapterDone"];
  content: TunnelDict["chapters"]["1"];
  chapter: JourneyChapterId;
  achievements: string[];
  ctaLabel?: string;
  onNext: () => void;
  pending?: boolean;
}) {
  const { doneTitle, doneBody } = content;

  return (
    <div className={styles.valueScreen}>
      <span className={styles.introIcon}>
        <PartyPopper aria-hidden="true" />
      </span>
      <p className={styles.kicker}>{dict.kicker.replace("{chapter}", String(chapter))}</p>
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
        {pending ? dict.pending : ctaLabel ?? dict.defaultCta}
        {!pending && <ArrowRight aria-hidden="true" />}
      </button>
    </div>
  );
}
