"use client";

import { Check } from "lucide-react";
import type { LocalizedVertical } from "@/lib/verticals-i18n";
import { Question } from "@/components/tunnel/question";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";
import styles from "@/app/commencer/tunnel.module.css";

export function StepVertical({
  dict,
  verticals,
  value,
  onChange,
}: {
  dict: TunnelDict["vertical"];
  verticals: LocalizedVertical[];
  value: string;
  onChange: (slug: string) => void;
}) {
  return (
    <Question
      kicker={dict.kicker}
      title={<>{dict.titleStart} <em>{dict.titleEm}</em> {dict.titleEnd}</>}
      subtitle={dict.subtitle}
    >
      <div className={styles.choiceGrid}>
        {verticals.map((item) => (
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
