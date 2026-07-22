"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { PLAN_GUIDANCE_CHOICES } from "@/lib/assistant/guidance";
import { PLAN_LABEL } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import { FluxContextCard } from "./flux-context-card";
import styles from "./flux-guidance.module.css";
import { useAssistantI18n } from "./assistant-i18n-provider";

export function FluxPlanSelector() {
  const { locale, copy: t } = useAssistantI18n();
  const [selected, setSelected] = useState<(typeof PLAN_GUIDANCE_CHOICES)[number] | null>(null);

  function trackRecommendation(plan: string) {
    void fetch("/api/assistant/state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "event",
        eventType: "action_clicked",
        surface: "marketing",
        routeKey: "/pricing",
        intentId: `pricing-plan-${plan}`,
      }),
      keepalive: true,
    });
  }
  return (
    <section className={styles.selector} aria-label={t.planHelp}>
      <FluxContextCard messageId="marketing-pricing" />
      <div className={styles.choices}>
        {PLAN_GUIDANCE_CHOICES.map((choice) => (
          <button key={choice.id} type="button" className={selected?.id === choice.id ? styles.choiceActive : styles.choice} aria-pressed={selected?.id === choice.id} onClick={() => setSelected(choice)}>
            <strong>{locale === "fr" ? choice.label : `${t.guide} · ${choice.id}`}</strong><small>{locale === "fr" ? choice.detail : t.marketingBody}</small>
          </button>
        ))}
      </div>
      {selected && (
        <div className={styles.recommendation} aria-live="polite">
          <p>{t.recommendation} <strong>{locale === "fr" ? PLAN_LABEL[selected.plan as Plan] : selected.plan}</strong>.</p>
          <Link className={styles.action} href={`#plan-${selected.plan}`} onClick={() => trackRecommendation(selected.plan)}>{t.seePlan} <ArrowRight aria-hidden="true" /></Link>
        </div>
      )}
    </section>
  );
}
