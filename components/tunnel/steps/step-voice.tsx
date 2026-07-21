"use client";

import { Sparkles } from "lucide-react";
import { Question } from "@/components/tunnel/question";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";
import styles from "@/app/commencer/tunnel.module.css";

// Les ids restent en français : c'est la valeur stockée telle quelle dans
// voice_profiles.tone (lib/journey.ts / actions.ts partagés avec le dashboard).
// Seul le libellé affiché est traduit.
export const TONE_IDS = [
  "Direct et efficace",
  "Chaleureux et proche",
  "Premium et expert",
  "Dynamique et audacieux",
] as const;

export function StepVoice({
  dict,
  value,
  gain,
  onChange,
}: {
  dict: TunnelDict["voice"];
  value: string;
  gain: string;
  onChange: (tone: string) => void;
}) {
  return (
    <Question
      kicker={dict.kicker}
      title={<>{dict.titleStart} <em>{dict.titleEm}</em></>}
      subtitle={dict.subtitle}
      gain={gain}
    >
      <div className={styles.toneGrid}>
        {TONE_IDS.map((id) => {
          const item = dict.tones[id];
          return (
            <button
              className={value === id ? styles.toneActive : styles.tone}
              key={id}
              type="button"
              onClick={() => onChange(id)}
            >
              <Sparkles aria-hidden="true" />
              <strong>{item.title}</strong>
              <small>{item.sample}</small>
            </button>
          );
        })}
      </div>
    </Question>
  );
}
