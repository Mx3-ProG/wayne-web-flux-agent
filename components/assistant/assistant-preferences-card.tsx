"use client";

import { useEffect, useState } from "react";
import { Bot, Check, PauseCircle } from "lucide-react";
import { ASSISTANT_STORAGE_KEY } from "@/lib/assistant/coaching";
import type { AssistantPreference } from "@/lib/assistant/types";
import styles from "./assistant-preferences-card.module.css";
import { useAssistantI18n } from "./assistant-i18n-provider";

export function AssistantPreferencesCard({ initialPreference }: { initialPreference: AssistantPreference }) {
  const { copy: t } = useAssistantI18n();
  const [preference, setPreference] = useState(initialPreference);
  const [paused, setPaused] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPaused(Boolean(
        preference.pausedUntil
          && new Date(preference.pausedUntil).getTime() > Date.now(),
      ));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [preference.pausedUntil]);

  function update(next: AssistantPreference) {
    setPreference(next);
    setPaused(Boolean(next.pausedUntil && new Date(next.pausedUntil).getTime() > Date.now()));
    setSaved(false);
    try {
      localStorage.setItem(ASSISTANT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // La préférence du compte reste la source de vérité si le stockage local est bloqué.
    }
    void fetch("/api/assistant/state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "preference", preference: next }),
    }).then((response) => {
      if (response.ok) setSaved(true);
    });
  }

  return (
    <div className={styles.card}>
      <span className={styles.icon}><Bot aria-hidden="true" /></span>
      <div className={styles.copy}>
        <h3>{t.preferencesTitle}</h3>
        <p>{t.preferencesBody}</p>
        {paused && <small><PauseCircle aria-hidden="true" /> {t.preferencesPaused}</small>}
        {saved && <small className={styles.saved}><Check aria-hidden="true" /> {t.saved}</small>}
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          role="switch"
          aria-checked={preference.enabled}
          data-active={preference.enabled}
          onClick={() => update({ ...preference, enabled: !preference.enabled, pausedUntil: null })}
        >
          <span aria-hidden="true" />
          {preference.enabled ? t.enabled : t.disabled}
        </button>
        {paused && (
          <button type="button" className={styles.resume} onClick={() => update({ ...preference, pausedUntil: null })}>
            {t.resume}
          </button>
        )}
      </div>
    </div>
  );
}
