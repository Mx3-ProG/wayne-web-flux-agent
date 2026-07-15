"use client";

import { CalendarClock } from "lucide-react";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";

const WEEKDAYS = [
  { id: 1, label: "Lun" },
  { id: 2, label: "Mar" },
  { id: 3, label: "Mer" },
  { id: 4, label: "Jeu" },
  { id: 5, label: "Ven" },
  { id: 6, label: "Sam" },
  { id: 0, label: "Dim" },
];

// Étape 5 : réservée aux métiers de service — une boutique pure n'a pas de
// créneaux à proposer, l'écran est alors retiré du Parcours (lib/journey.ts).
export function StepAgenda({
  days,
  openingTime,
  closingTime,
  gain,
  onChange,
}: {
  days: number[];
  openingTime: string;
  closingTime: string;
  gain: string;
  onChange: (patch: {
    days?: number[];
    openingTime?: string;
    closingTime?: string;
  }) => void;
}) {
  return (
    <Question
      kicker="Étape 5 · Ton agenda"
      title={<>Quand es-tu <em>disponible ?</em></>}
      subtitle="Choisis tes jours et une première plage horaire. Tes clients pourront réserver seuls, même quand tu ne réponds pas."
      gain={gain}
    >
      <div className={styles.scheduleCard}>
        <CalendarClock aria-hidden="true" />
        <div className={styles.dayPicker}>
          {WEEKDAYS.map((day) => (
            <button
              key={day.id}
              type="button"
              className={days.includes(day.id) ? styles.dayActive : styles.day}
              onClick={() =>
                onChange({
                  days: days.includes(day.id)
                    ? days.filter((item) => item !== day.id)
                    : [...days, day.id],
                })
              }
              aria-pressed={days.includes(day.id)}
            >
              {day.label}
            </button>
          ))}
        </div>
        <div className={styles.timeFields}>
          <label>
            <span>De</span>
            <input
              type="time"
              value={openingTime}
              onChange={(event) => onChange({ openingTime: event.target.value })}
            />
          </label>
          <i>→</i>
          <label>
            <span>À</span>
            <input
              type="time"
              value={closingTime}
              onChange={(event) => onChange({ closingTime: event.target.value })}
            />
          </label>
        </div>
      </div>
    </Question>
  );
}
