"use client";

import Image from "next/image";
import { MessageCircleMore, Minimize2 } from "lucide-react";
import styles from "./flux-guidance.module.css";
import { useAssistantI18n } from "./assistant-i18n-provider";

export function FluxBrandHero() {
  const { copy: t, messagesExpanded, setMessagesExpanded } = useAssistantI18n();
  function openAssistant() {
    window.dispatchEvent(new CustomEvent("flux:assistant-open"));
  }

  return (
    <aside className={styles.brandGuide} data-collapsed={!messagesExpanded} aria-label={t.heroAria}>
      <button
        type="button"
        className={styles.brandGuideButton}
        onClick={messagesExpanded ? openAssistant : () => setMessagesExpanded(true)}
        aria-label={messagesExpanded ? t.heroOpen : t.open}
      >
        <Image
          src="/flux-guide-transparent.webp"
          width={384}
          height={384}
          alt=""
          priority
        />
        <span className={styles.brandGuideStatus} aria-hidden="true" />
      </button>
      {messagesExpanded && (
        <>
          <button type="button" className={styles.brandGuideBubble} onClick={openAssistant}>
            <small>{t.heroHello}</small>
            <strong>{t.heroQuestion}</strong>
            <span><MessageCircleMore aria-hidden="true" /> {t.heroCta}</span>
          </button>
          <button type="button" className={styles.brandGuideCollapse} aria-label={t.hideTip} onClick={() => setMessagesExpanded(false)}>
            <Minimize2 aria-hidden="true" />
          </button>
        </>
      )}
    </aside>
  );
}
