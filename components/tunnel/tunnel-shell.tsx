"use client";

import Link from "next/link";
import { Clock3 } from "lucide-react";
import { FluxBrand } from "@/components/flux-brand";
import { JOURNEY_CHAPTERS, type JourneyChapterId } from "@/lib/journey";
import styles from "@/app/commencer/tunnel.module.css";

type Props = {
  chapter: JourneyChapterId;
  completedCount: number;
  total: number;
  trialDays: number;
  children: React.ReactNode;
};

// Coque du tunnel : elle porte la progression narrative — le chapitre en cours,
// l'avancement réel du Parcours (partagé avec le dashboard, donc jamais
// décoratif) et le compte à rebours d'essai, lu sur le vrai trial_ends_at.
export function TunnelShell({
  chapter,
  completedCount,
  total,
  trialDays,
  children,
}: Props) {
  const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <>
      <header className={styles.header}>
        <Link href="/espace" aria-label="Aller à mon espace">
          <FluxBrand className={styles.brand} />
        </Link>
        <div className={styles.progressMeta}>
          <span>
            Chapitre {chapter} · {JOURNEY_CHAPTERS[chapter].title} —{" "}
            {completedCount}/{total}
          </span>
          <div className={styles.progress}>
            <i style={{ width: `${percent}%` }} />
          </div>
        </div>
        <span className={styles.trialPill}>
          <Clock3 aria-hidden="true" />
          {trialDays} j d&apos;essai
        </span>
      </header>
      {children}
    </>
  );
}
