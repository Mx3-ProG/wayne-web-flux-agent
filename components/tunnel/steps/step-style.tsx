"use client";

import { Check } from "lucide-react";
import { DESIGN_KITS } from "@/lib/vitrine-design/registry";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";

// Avant-dernier écran : la bibliothèque de design complète (lib/vitrine-design),
// la même que celle de l'éditeur. Aucun filtre « premium » ici : les thèmes
// premium ne sont pas verrouillés (lib/plans.ts, ADVANCED_CUSTOMIZATION_GATED),
// les afficher grisés mentirait sur ce qui est réellement accessible.
// Pas de `gain` : contrairement aux autres écrans, le style n'est pas une des 8
// étapes du Parcours (lib/journey.ts) — il n'a donc pas de bénéfice à afficher.
export function StepStyle({
  value,
  onChange,
}: {
  value: string;
  onChange: (kitId: string) => void;
}) {
  return (
    <Question
      kicker="Ton style"
      title={<>Choisis ton <em>style.</em></>}
      subtitle="Chaque style pose les couleurs, les typos et la mise en page de ta vitrine. L'aperçu suit ton choix, et tout reste modifiable ensuite."
    >
      <div className={styles.styleGrid}>
        {DESIGN_KITS.map((kit) => (
          <button
            className={value === kit.id ? styles.styleActive : styles.style}
            key={kit.id}
            type="button"
            onClick={() => onChange(kit.id)}
            style={
              {
                "--kit-primary": kit.defaults.colors.primary,
                "--kit-background": kit.defaults.colors.background,
                "--kit-card": kit.defaults.colors.card,
              } as React.CSSProperties
            }
          >
            <span className={styles.styleSwatch} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <strong>{kit.name}</strong>
            <small>{kit.description}</small>
            {value === kit.id && <Check aria-hidden="true" />}
          </button>
        ))}
      </div>
    </Question>
  );
}
