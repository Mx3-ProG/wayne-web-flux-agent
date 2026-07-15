"use client";

import { Sparkles } from "lucide-react";
import styles from "@/app/commencer/tunnel.module.css";

// Ossature commune des écrans de question : kicker, titre, sous-titre, et le
// « gain » de l'étape — le bénéfice concret, repris de lib/journey.ts pour
// rester aligné avec ce que le dashboard promet sur la même étape.
export function Question({
  kicker,
  title,
  subtitle,
  gain,
  children,
}: {
  kicker: string;
  title: React.ReactNode;
  subtitle: string;
  gain?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.question}>
      <p className={styles.kicker}>{kicker}</p>
      <h1>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
      {gain && (
        <p className={styles.gain}>
          <Sparkles aria-hidden="true" />
          {gain}
        </p>
      )}
      {children}
    </div>
  );
}
