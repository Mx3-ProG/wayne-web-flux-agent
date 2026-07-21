"use client";

import Link from "next/link";
import { Clock3 } from "lucide-react";
import { FluxBrand } from "@/components/flux-brand";
import type { JourneyChapterId } from "@/lib/journey";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";
import styles from "@/app/commencer/tunnel.module.css";

type Props = {
  dict: TunnelDict["shell"];
  chapters: TunnelDict["chapters"];
  chapter: JourneyChapterId;
  completedCount: number;
  total: number;
  trialDays: number;
  children: React.ReactNode;
};

function fillTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match
  );
}

// Coque du tunnel : elle porte la progression narrative — le chapitre en cours,
// l'avancement réel du Parcours (partagé avec le dashboard, donc jamais
// décoratif) et le compte à rebours d'essai, lu sur le vrai trial_ends_at.
export function TunnelShell({
  dict,
  chapters,
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
        <Link href="/espace" aria-label={dict.espaceAria}>
          <FluxBrand className={styles.brand} />
        </Link>
        <div className={styles.progressMeta}>
          <span>
            {fillTemplate(dict.chapterProgress, {
              chapter,
              title: chapters[String(chapter) as "1" | "2" | "3"].title,
              done: completedCount,
              total,
            })}
          </span>
          <div className={styles.progress}>
            <i style={{ width: `${percent}%` }} />
          </div>
        </div>
        <span className={styles.trialPill}>
          <Clock3 aria-hidden="true" />
          {fillTemplate(dict.trialDays, { days: trialDays })}
        </span>
      </header>
      {children}
    </>
  );
}
