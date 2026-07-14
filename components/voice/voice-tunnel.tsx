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
import { EMPTY_VOICE, VOICE_STEPS, type VoiceDraft } from "./voice-options";
import { FluxBrand } from "@/components/flux-brand";
import styles from "./voice-tunnel.module.css";

export function VoiceTunnel({ initialVoice }: { initialVoice: VoiceDraft | null }) {
  const router = useRouter();
  const [step, setStep] = useState(-1);
  const [draft, setDraft] = useState<VoiceDraft>({ ...EMPTY_VOICE, ...initialVoice });

  const current = step >= 0 ? VOICE_STEPS[step] : null;
  const progress = step < 0 ? 0 : ((step + 1) / VOICE_STEPS.length) * 100;
  const isMultiple = current ? "multiple" in current && current.multiple : false;
  const selectedValues = current
    ? isMultiple
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
    if (isMultiple) {
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
    if (step === VOICE_STEPS.length - 1) {
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
            <span>Question {step + 1} sur {VOICE_STEPS.length}</span>
            <div className={styles.progress}><i style={{ width: `${progress}%` }} /></div>
          </div>
        )}
        <Link href="/contexte" className={styles.exit}>Quitter</Link>
      </header>

      <main className={styles.stage}>
        {step === -1 ? (
          <section className={styles.intro}>
            <span className={styles.introIcon}><MessageSquareText aria-hidden="true" /></span>
            <p className={styles.kicker}>Ton intelligence de marque</p>
            <h1>
              FLUX, l’intelligence des développeurs au service des{" "}
              <em>Business porteurs.</em>
            </h1>
            <p>
              Aucun texte à rédiger. Choisis simplement ce qui te ressemble,
              Flux compose ta voix et prépare une communication cohérente.
            </p>
            <button type="button" className={`flux-button-smooth ${styles.primary}`} onClick={() => setStep(0)}>
              Créer ma voix <ArrowRight aria-hidden="true" />
            </button>
            <small>7 choix · moins de 2 minutes · modifiable à tout moment</small>
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
                    key={option.value}
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
            <ArrowLeft aria-hidden="true" /> Retour
          </button>
          <button type="button" className={`flux-button-smooth ${styles.primary}`} disabled={!canContinue} onClick={next}>
            {step === VOICE_STEPS.length - 1 ? "Voir mon résumé" : "Continuer"}
            <ArrowRight aria-hidden="true" />
          </button>
        </footer>
      )}
    </div>
  );
}
