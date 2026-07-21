"use client";

import { BarChart3, Check, Clock3, Search, Users } from "lucide-react";
import { Question } from "@/components/tunnel/question";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";
import styles from "@/app/commencer/tunnel.module.css";

const GOAL_ICONS = {
  temps: Clock3,
  google: Search,
  leads: Users,
  tout: BarChart3,
} as const;

export const GOAL_IDS = ["temps", "google", "leads", "tout"] as const;

export function StepGoals({
  dict,
  value,
  onToggle,
}: {
  dict: TunnelDict["goals"];
  value: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <Question
      kicker={dict.kicker}
      title={<>{dict.titleStart} <em>{dict.titleEm}</em> {dict.titleEnd}</>}
      subtitle={dict.subtitle}
    >
      <div className={styles.goalGrid}>
        {GOAL_IDS.map((id) => {
          const Icon = GOAL_ICONS[id];
          const item = dict.items[id];
          const active = value.includes(id);
          return (
            <button
              className={active ? styles.goalActive : styles.goal}
              key={id}
              type="button"
              onClick={() => onToggle(id)}
              aria-pressed={active}
            >
              <Icon aria-hidden="true" />
              <span>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </span>
              {active && <Check aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </Question>
  );
}
