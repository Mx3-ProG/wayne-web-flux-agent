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

const SUMMARY: {
  key: keyof VoiceDraft;
  label: string;
  fallback: string;
  format?: (value: string) => string;
}[] = [
  { key: "tone", label: "Ton énergie", fallback: "À définir" },
  { key: "address_form", label: "Ta façon de t’adresser aux clients", fallback: "À définir", format: (value: string) => value === "tu" ? "Tu tutoies tes clients" : "Tu vouvoies tes clients" },
  { key: "emojis", label: "Ton usage des emojis", fallback: "À définir", format: (value: string) => value === "beaucoup" ? "Souvent, ils font partie de ton style" : value === "parfois" ? "Avec modération" : "Une communication sans emoji" },
  { key: "specialty", label: "Ta signature", fallback: "À définir" },
  { key: "often_told", label: "Ce que tes clients disent de toi", fallback: "À définir" },
  { key: "story", label: "Ton histoire", fallback: "À définir" },
  { key: "vals", label: "Tes valeurs", fallback: "À définir" },
];

export function VoiceForm({
  initialVoice,
  preparedVoice,
  completion,
}: {
  initialVoice: VoiceProfile | null;
  preparedVoice: VoiceDraft | null;
  completion: number;
}) {
  const router = useRouter();
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
        toast.error(
          `Modifier ton contexte coûte ${CONTEXT_CHANGE_COST} crédits et ton solde est insuffisant. Recharge tes crédits depuis la page Crédits.`
        );
        return;
      }
      if (result.error === "subscription_required") {
        toast.error(
          "Ton essai FLUX est terminé. Choisis une formule pour continuer."
        );
        return;
      }
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Ta voix est enregistrée. Flux peut maintenant parler comme toi.");
      router.replace("/contexte");
      router.refresh();
    });
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.heroIcon}><MessageSquareText aria-hidden="true" /></span>
        <div>
          <p className={styles.kicker}>{isReview ? "Ta voix est prête" : "Ton identité éditoriale"}</p>
          <h1>{isReview ? "Voici comment Flux va parler pour toi." : "Flux connaît ta voix."}</h1>
          <p>
            {isReview
              ? "Vérifie le résumé. Si tout te ressemble, il ne reste plus qu’à l’enregistrer."
              : "Retrouve ici les choix qui guident tous tes prochains contenus."}
          </p>
        </div>
      </section>

      <section className={styles.completion} aria-label={`Profil complété à ${profileCompletion}%`}>
        <span>
          <Sparkles aria-hidden="true" />
          <strong>{profileCompletion}%</strong>
          <small>de ta voix comprise par Flux</small>
        </span>
        <div><i style={{ width: `${profileCompletion}%` }} /></div>
      </section>

      <section className={styles.summary}>
        <div className={styles.summaryHeader}>
          <div>
            <p className={styles.kicker}>Ton profil</p>
            <h2>Ce que Flux a retenu</h2>
          </div>
          <Link href="/contexte/configurer" className={styles.editLink}>
            <Pencil aria-hidden="true" /> Refaire le questionnaire
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
            <strong>Tout te ressemble ?</strong>
            <small>
              {isUpdate
                ? `Mettre à jour ton contexte coûte ${CONTEXT_CHANGE_COST} cr.`
                : "Tu pourras refaire ce questionnaire à tout moment."}
            </small>
          </span>
          <button type="button" disabled={isPending} onClick={save}>
            <Save aria-hidden="true" />
            {isPending
              ? "Enregistrement…"
              : isUpdate
                ? `Enregistrer ma voix (${CONTEXT_CHANGE_COST} cr.)`
                : "Enregistrer ma voix"}
          </button>
        </div>
      ) : (
        <Link href="/contexte/configurer" className={styles.restart}>
          <Pencil aria-hidden="true" /> Mettre à jour ma voix
        </Link>
      )}
    </div>
  );
}
