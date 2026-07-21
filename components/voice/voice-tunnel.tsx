"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import {
  EMPTY_VOICE,
  INVARIANT_VALUE_STEPS,
  STEP_MULTIPLE,
  STEP_OPTION_IDS,
  VOICE_STEP_KEYS,
  type VoiceDraft,
} from "./voice-options";
import { FluxBrand } from "@/components/flux-brand";
import styles from "./voice-tunnel.module.css";
import type { VoiceDict } from "@/lib/i18n/get-dictionary";

type LocalizedOption = { id: string; title: string; text: string; value: string };
type LocalizedStep = {
  key: (typeof VOICE_STEP_KEYS)[number];
  kicker: string;
  title: string;
  subtitle: string;
  multiple: boolean;
  options: LocalizedOption[];
};

// Fusionne la structure invariante (ids, ordre) avec le texte traduit du
// dictionnaire "voice" (steps.*) — voir voice-options.ts pour le pourquoi de
// cette séparation. Casse au build si une clé attendue manque (dictionnaire
// typé contre le français).
function buildLocalizedSteps(t: VoiceDict): LocalizedStep[] {
  return VOICE_STEP_KEYS.map((key) => {
    const stepDict = t.steps[key];
    const invariant = INVARIANT_VALUE_STEPS.has(key);
    return {
      key,
      kicker: stepDict.kicker,
      title: stepDict.title,
      subtitle: stepDict.subtitle,
      multiple: STEP_MULTIPLE[key] === true,
      options: STEP_OPTION_IDS[key].map((id) => {
        const option = (stepDict.options as Record<string, { title: string; text: string; value?: string }>)[id];
        return { id, title: option.title, text: option.text, value: invariant ? id : (option.value ?? id) };
      }),
    };
  });
}

export function VoiceTunnel({
  initialVoice,
  t,
}: {
  initialVoice: VoiceDraft | null;
  t: VoiceDict;
}) {
  const router = useRouter();
  const [step, setStep] = useState(-1);
  const [draft, setDraft] = useState<VoiceDraft>({ ...EMPTY_VOICE, ...initialVoice });
  const steps = useMemo(() => buildLocalizedSteps(t), [t]);

  const current = step >= 0 ? steps[step] : null;
  const progress = step < 0 ? 0 : ((step + 1) / steps.length) * 100;
  // Un profil enregistré avant un changement de langue peut encore contenir
  // l'ancienne phrase française : on la garde affichée telle quelle (aucune
  // perte de données), mais elle ne correspondra à aucune option traduite —
  // l'utilisateur la remplace simplement en choisissant à nouveau.
  const selectedValues = current
    ? current.multiple
      ? draft[current.key].split(", ").filter(Boolean)
      : [draft[current.key]].filter(Boolean)
    : [];
  const canContinue = selectedValues.length > 0;

  const reviewUrl = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(draft).forEach(([key, value]) => params.set(key, value));
    params.set("review", "1");
    return `/contexte?${params.toString()}`;
  }, [draft]);

  function choose(value: string) {
    if (!current) return;
    if (current.multiple) {
      const values = selectedValues.includes(value)
        ? selectedValues.filter((item) => item !== value)
        : selectedValues.length < 3
          ? [...selectedValues, value]
          : selectedValues;
      setDraft((previous) => ({ ...previous, [current.key]: values.join(", ") }));
      return;
    }
    setDraft((previous) => ({ ...previous, [current.key]: value }));
  }

  function next() {
    if (step === steps.length - 1) {
      router.push(reviewUrl);
      return;
    }
    setStep((value) => value + 1);
  }

  return (
    <div className={styles.tunnel}>
      <header className={styles.header}>
        <Link href="/contexte" className={styles.brand}>
          <FluxBrand />
        </Link>
        {step >= 0 && (
          <div className={styles.progressMeta}>
            <span>{t.tunnel.question.replace("{current}", String(step + 1)).replace("{total}", String(steps.length))}</span>
            <div className={styles.progress}><i style={{ width: `${progress}%` }} /></div>
          </div>
        )}
        <Link href="/contexte" className={styles.exit}>{t.tunnel.exit}</Link>
      </header>

      <main className={styles.stage}>
        {step === -1 ? (
          <section className={styles.intro}>
            <span className={styles.introIcon}><MessageSquareText aria-hidden="true" /></span>
            <p className={styles.kicker}>{t.tunnel.introKicker}</p>
            <h1>
              {t.tunnel.introTitleStart}{" "}
              <em>{t.tunnel.introTitleEm}</em>
            </h1>
            <p>{t.tunnel.introText}</p>
            <button type="button" className={`flux-button-smooth ${styles.primary}`} onClick={() => setStep(0)}>
              {t.tunnel.createVoice} <ArrowRight aria-hidden="true" />
            </button>
            <small>{t.tunnel.introHint}</small>
          </section>
        ) : current ? (
          <section className={styles.question}>
            <p className={styles.kicker}>{current.kicker}</p>
            <h1>{current.title}</h1>
            <p className={styles.subtitle}>{current.subtitle}</p>
            <div className={styles.options}>
              {current.options.map((option) => {
                const selected = selectedValues.includes(option.value);
                return (
                  <button
                    type="button"
                    key={option.id}
                    className={selected ? styles.optionActive : styles.option}
                    aria-pressed={selected}
                    onClick={() => choose(option.value)}
                  >
                    <span className={styles.optionIcon}>
                      {selected ? <Check aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                    </span>
                    <span>
                      <strong>{option.title}</strong>
                      <small>{option.text}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>

      {step >= 0 && (
        <footer className={styles.controls}>
          <button type="button" onClick={() => setStep((value) => value - 1)}>
            <ArrowLeft aria-hidden="true" /> {t.tunnel.back}
          </button>
          <button type="button" className={`flux-button-smooth ${styles.primary}`} disabled={!canContinue} onClick={next}>
            {step === steps.length - 1 ? t.tunnel.seeSummary : t.tunnel.continue}
            <ArrowRight aria-hidden="true" />
          </button>
        </footer>
      )}
    </div>
  );
}
