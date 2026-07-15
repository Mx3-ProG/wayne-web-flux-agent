"use client";

import { Sparkles } from "lucide-react";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";

export const TONES = [
  { id: "Direct et efficace", title: "Direct & efficace", sample: "On va droit au résultat." },
  { id: "Chaleureux et proche", title: "Chaleureux & proche", sample: "Comme avec tes meilleurs clients." },
  { id: "Premium et expert", title: "Premium & expert", sample: "Sobre, précis, haut de gamme." },
  { id: "Dynamique et audacieux", title: "Dynamique & audacieux", sample: "De l'énergie et du caractère." },
];

export function StepVoice({
  value,
  gain,
  onChange,
}: {
  value: string;
  gain: string;
  onChange: (tone: string) => void;
}) {
  return (
    <Question
      kicker="Étape 2 · Ta voix"
      title={<>Flux doit parler <em>comme toi.</em></>}
      subtitle="Choisis le ton qui ressemble le plus à ton commerce. C'est lui que l'IA imitera dans tous tes contenus."
      gain={gain}
    >
      <div className={styles.toneGrid}>
        {TONES.map((item) => (
          <button
            className={value === item.id ? styles.toneActive : styles.tone}
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
          >
            <Sparkles aria-hidden="true" />
            <strong>{item.title}</strong>
            <small>{item.sample}</small>
          </button>
        ))}
      </div>
    </Question>
  );
}
