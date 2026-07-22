"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Minimize2, X } from "lucide-react";
import { getFluxGuidance, type FluxGuidanceId } from "@/lib/assistant/guidance";
import styles from "./flux-guidance.module.css";
import { localizeGuidance } from "@/lib/assistant/i18n";
import { useAssistantI18n } from "./assistant-i18n-provider";

type Props = {
  messageId: FluxGuidanceId;
  firstVisitOnly?: boolean;
  dismissible?: boolean;
  className?: string;
};

function track(messageId: string, eventType: "message_seen" | "message_dismissed" | "action_clicked" | "step_completed") {
  void fetch("/api/assistant/state", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      kind: "event",
      eventType,
      surface: getFluxGuidance(messageId as FluxGuidanceId).surface,
      routeKey: window.location.pathname.slice(0, 160),
      intentId: messageId,
    }),
    keepalive: true,
  });
}

export function FluxContextCard({ messageId, firstVisitOnly = false, dismissible = false, className }: Props) {
  const { locale, copy: t, destinations, messagesExpanded, setMessagesExpanded } = useAssistantI18n();
  const message = localizeGuidance(getFluxGuidance(messageId), locale, destinations);
  const [visible, setVisible] = useState(!firstVisitOnly);

  useEffect(() => {
    const storageKey = `flux-guidance:seen:${messageId}`;
    const frame = window.requestAnimationFrame(() => {
      if (firstVisitOnly && localStorage.getItem(storageKey)) return;
      setVisible(true);
      if (firstVisitOnly) localStorage.setItem(storageKey, "1");
      track(messageId, "message_seen");
      if (message.trigger === "success") track(messageId, "step_completed");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [firstVisitOnly, message.surface, message.trigger, messageId]);

  if (!visible) return null;

  if (!messagesExpanded) {
    return (
      <button
        type="button"
        className={`${styles.collapsedCard} ${className ?? ""}`}
        aria-label={`${t.open}: ${message.title}`}
        onClick={() => setMessagesExpanded(true)}
      >
        <Image src="/flux-guide-transparent.webp" width={384} height={384} alt="" />
      </button>
    );
  }

  const placementClass = message.placement === "brand-hero"
    ? styles.hero
    : message.placement === "step"
      ? styles.step
      : message.placement === "compact"
        ? styles.compact
        : "";
  const statusClass = message.trigger === "error" ? styles.error : message.trigger === "success" ? styles.success : "";

  return (
    <aside className={`${styles.card} ${placementClass} ${statusClass} ${className ?? ""}`} aria-label={`${t.tipAria}: ${message.title}`} aria-live={message.trigger === "error" || message.trigger === "success" ? "polite" : undefined}>
      <span className={styles.portrait}><Image src="/flux-guide-transparent.webp" width={384} height={384} alt="" /></span>
      <div className={styles.copy}>
        <small className={styles.eyebrow}>{message.eyebrow}</small>
        {message.placement === "brand-hero" ? <h2>{message.title}</h2> : <h3>{message.title}</h3>}
        <p>{message.body}</p>
      </div>
      {message.action && (
        <Link className={styles.action} href={message.action.href} onClick={() => track(messageId, "action_clicked")}>
          {message.action.label}<ArrowRight aria-hidden="true" />
        </Link>
      )}
      <button type="button" className={`${styles.collapse} ${dismissible ? styles.collapseWithDismiss : ""}`} aria-label={t.hideTip} onClick={() => setMessagesExpanded(false)}>
        <Minimize2 aria-hidden="true" />
      </button>
      {dismissible && (
        <button type="button" className={styles.dismiss} aria-label={t.hideTip} onClick={() => { setVisible(false); track(messageId, "message_dismissed"); }}>
          <X aria-hidden="true" />
        </button>
      )}
    </aside>
  );
}
