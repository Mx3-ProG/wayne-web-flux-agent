"use client";

import { CalendarClock } from "lucide-react";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";

// Étape 5 : réservée aux métiers de service — une boutique pure n'a pas de
// créneaux à proposer, l'écran est alors retiré du Parcours (lib/journey.ts).
export function StepAgenda({
  dict,
  days,
  openingTime,
  closingTime,
  gain,
  onChange,
}: {
  dict: TunnelDict["agenda"];
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
  const weekdays = [{ id: 1, label: dict.weekdays.mon }, { id: 2, label: dict.weekdays.tue }, { id: 3, label: dict.weekdays.wed }, { id: 4, label: dict.weekdays.thu }, { id: 5, label: dict.weekdays.fri }, { id: 6, label: dict.weekdays.sat }, { id: 0, label: dict.weekdays.sun }];
  return (
    <Question
      kicker={dict.kicker}
      title={<>{dict.titleStart} <em>{dict.titleEm}</em></>}
      subtitle={dict.subtitle}
      gain={gain}
    >
      <div className={styles.scheduleCard}>
        <CalendarClock aria-hidden="true" />
        <div className={styles.dayPicker}>
          {weekdays.map((day) => (
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
            <span>{dict.from}</span>
            <input
              type="time"
              value={openingTime}
              onChange={(event) => onChange({ openingTime: event.target.value })}
            />
          </label>
          <i>→</i>
          <label>
            <span>{dict.to}</span>
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
