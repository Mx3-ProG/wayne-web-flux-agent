"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, MessageSquareText, Pencil, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { VoiceProfile } from "@/lib/types";
import { CONTEXT_CHANGE_COST } from "@/lib/plans";
import { saveVoiceProfile } from "@/app/(app)/contexte/actions";
import { EMPTY_VOICE, type VoiceDraft } from "./voice-options";
import styles from "./voice-form.module.css";
import type { VoiceDict } from "@/lib/i18n/get-dictionary";
import { KARLMADA_BLOCK_MESSAGE } from "@/lib/karlmada-constants";

export function VoiceForm({
  initialVoice,
  preparedVoice,
  completion,
  t,
}: {
  initialVoice: VoiceProfile | null;
  preparedVoice: VoiceDraft | null;
  completion: number;
  t: VoiceDict;
}) {
  const router = useRouter();
  const s = t.form.summary;
  const SUMMARY: {
    key: keyof VoiceDraft;
    label: string;
    fallback: string;
    format?: (value: string) => string;
  }[] = [
    { key: "tone", label: s.tone, fallback: s.fallback },
    {
      key: "address_form",
      label: s.addressForm,
      fallback: s.fallback,
      format: (value: string) => (value === "tu" ? s.addressTu : s.addressVous),
    },
    {
      key: "emojis",
      label: s.emojis,
      fallback: s.fallback,
      format: (value: string) =>
        value === "beaucoup" ? s.emojisMuch : value === "parfois" ? s.emojisSome : s.emojisNone,
    },
    { key: "specialty", label: s.specialty, fallback: s.fallback },
    { key: "often_told", label: s.oftenTold, fallback: s.fallback },
    { key: "story", label: s.story, fallback: s.fallback },
    { key: "vals", label: s.vals, fallback: s.fallback },
  ];
  const [draft] = useState<VoiceDraft>({ ...EMPTY_VOICE, ...initialVoice, ...preparedVoice });
  const [isPending, startTransition] = useTransition();
  const isReview = Boolean(preparedVoice);
  // 1re création gratuite ; toute mise à jour du contexte coûte 5 cr.
  const isUpdate = Boolean(initialVoice);
  const filled = SUMMARY.filter((item) => draft[item.key]).length;
  const profileCompletion = isReview
    ? Math.round((filled / SUMMARY.length) * 100)
    : completion;

  function save() {
    startTransition(async () => {
      const result = await saveVoiceProfile(draft);
      if (result.error === "insufficient_credits") {
        toast.error(t.form.insufficientCredits.replace("{cost}", String(CONTEXT_CHANGE_COST)));
        return;
      }
      if (result.error === "subscription_required") {
        toast.error(t.form.subscriptionRequired);
        return;
      }
      if (result.error) {
        const code = result.error === KARLMADA_BLOCK_MESSAGE ? "content_blocked" : result.error;
        toast.error(t.errors[code as keyof typeof t.errors] ?? t.errors.unknown);
        return;
      }
      toast.success(t.form.saveSuccess);
      router.replace("/contexte");
      router.refresh();
    });
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.heroIcon}><MessageSquareText aria-hidden="true" /></span>
        <div>
          <p className={styles.kicker}>{isReview ? t.form.reviewKicker : t.form.defaultKicker}</p>
          <h1>{isReview ? t.form.reviewTitle : t.form.defaultTitle}</h1>
          <p>{isReview ? t.form.reviewText : t.form.defaultText}</p>
        </div>
      </section>

      <section className={styles.completion} aria-label={t.form.completionAria.replace("{percent}", String(profileCompletion))}>
        <span>
          <Sparkles aria-hidden="true" />
          <strong>{profileCompletion}%</strong>
          <small>{t.form.completionLabel}</small>
        </span>
        <div><i style={{ width: `${profileCompletion}%` }} /></div>
      </section>

      <section className={styles.summary}>
        <div className={styles.summaryHeader}>
          <div>
            <p className={styles.kicker}>{t.form.profileLabel}</p>
            <h2>{t.form.profileTitle}</h2>
          </div>
          <Link href="/contexte/configurer" className={styles.editLink}>
            <Pencil aria-hidden="true" /> {t.form.redo}
          </Link>
        </div>

        <div className={styles.summaryGrid}>
          {SUMMARY.map((item, index) => {
            const rawValue = draft[item.key];
            const value = rawValue && item.format ? item.format(rawValue) : rawValue;
            return (
              <article className={styles.summaryCard} key={item.key}>
                <span className={styles.cardNumber}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.cardCheck}><Check aria-hidden="true" /></span>
                <small>{item.label}</small>
                <strong>{value || item.fallback}</strong>
              </article>
            );
          })}
        </div>
      </section>

      {isReview ? (
        <div className={styles.saveBar}>
          <span>
            <strong>{t.form.allYou}</strong>
            <small>
              {isUpdate
                ? t.form.updateCost.replace("{cost}", String(CONTEXT_CHANGE_COST))
                : t.form.redoAnytime}
            </small>
          </span>
          <button type="button" disabled={isPending} onClick={save}>
            <Save aria-hidden="true" />
            {isPending
              ? t.form.saving
              : isUpdate
                ? t.form.saveVoiceUpdate.replace("{cost}", String(CONTEXT_CHANGE_COST))
                : t.form.saveVoice}
          </button>
        </div>
      ) : (
        <Link href="/contexte/configurer" className={styles.restart}>
          <Pencil aria-hidden="true" /> {t.form.updateVoice}
        </Link>
      )}
    </div>
  );
}
