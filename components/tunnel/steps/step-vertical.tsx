"use client";

import { Check } from "lucide-react";
import { VERTICALS } from "@/lib/verticals";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";

export function StepVertical({
  value,
  onChange,
}: {
  value: string;
  onChange: (slug: string) => void;
}) {
  return (
    <Question
      kicker="Ton activité"
      title={<>Tu fais <em>quoi</em> de mieux ?</>}
      subtitle="Choisis ton univers. Flux adapte les outils, le vocabulaire et les couleurs de ta vitrine."
    >
      <div className={styles.choiceGrid}>
        {VERTICALS.map((item) => (
          <button
            className={value === item.slug ? styles.choiceActive : styles.choice}
            key={item.slug}
            type="button"
            onClick={() => onChange(item.slug)}
          >
            <span>{item.emoji}</span>
            <strong>{item.label}</strong>
            {value === item.slug && <Check aria-hidden="true" />}
          </button>
        ))}
      </div>
    </Question>
  );
}
