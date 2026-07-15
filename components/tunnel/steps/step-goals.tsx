"use client";

import { BarChart3, Check, Clock3, Search, Users } from "lucide-react";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";

export const GOALS = [
  {
    id: "temps",
    icon: Clock3,
    title: "Je manque de temps",
    text: "Le contenu et les réponses clients me prennent mes soirées.",
  },
  {
    id: "google",
    icon: Search,
    title: "On ne me trouve pas",
    text: "Je veux remonter sur Google et dans ma ville.",
  },
  {
    id: "leads",
    icon: Users,
    title: "Je veux plus de clients",
    text: "J'ai besoin de demandes régulières et qualifiées.",
  },
  {
    id: "tout",
    icon: BarChart3,
    title: "Tout centraliser",
    text: "Je veux arrêter de jongler entre cinq outils.",
  },
];

export function StepGoals({
  value,
  onToggle,
}: {
  value: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <Question
      kicker="Tes objectifs"
      title={<>Qu&apos;est-ce qui te <em>freine</em> aujourd&apos;hui ?</>}
      subtitle="Choisis tout ce qui te correspond. Ce que tu dis ici, l'IA s'en sert pour écrire à ta place."
    >
      <div className={styles.goalGrid}>
        {GOALS.map((item) => {
          const Icon = item.icon;
          const active = value.includes(item.id);
          return (
            <button
              className={active ? styles.goalActive : styles.goal}
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
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
