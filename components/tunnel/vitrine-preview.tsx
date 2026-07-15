"use client";

import { CalendarClock, Sparkles, Tag } from "lucide-react";
import { getVertical } from "@/lib/verticals";
import styles from "./vitrine-preview.module.css";

export type PreviewState = {
  vertical: string;
  businessName: string;
  jobTitle: string;
  city: string;
  tone: string;
  categoryName: string;
  productName: string;
  productPrice: string;
  offerTitle: string;
  offerPrice: string;
  days: number[];
  openingTime: string;
  closingTime: string;
};

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function euros(value: string): string {
  const n = Number(value);
  if (!value.trim() || Number.isNaN(n)) return "—";
  return `${n.toFixed(2).replace(".", ",")} €`;
}

// La « révélation vivante » : la vitrine se construit sous les yeux de
// l'utilisateur au fil de ses réponses, au lieu d'un écran d'aperçu unique à la
// fin. Monté une seule fois par tunnel.tsx, HORS du switch d'écrans — le
// remonter à chaque étape tuerait les transitions CSS.
//
// Aucune dépendance d'animation (framer-motion n'est pas dans le projet) : les
// couleurs transitionnent via des custom properties, et les blocs nouvellement
// remplis passent par @keyframes previewPop, redéclenché par la `key` React.
export function VitrinePreview({ state }: { state: PreviewState }) {
  const vertical = state.vertical ? getVertical(state.vertical) : null;
  const colors = vertical?.defaultColors;
  const name = state.businessName.trim() || "Ton commerce";
  const job = state.jobTitle.trim() || vertical?.jobTitles[0] || "Ton activité";
  const city = state.city.trim();
  const openDays = [...state.days].sort((a, b) => (a || 7) - (b || 7));

  return (
    <aside
      className={styles.preview}
      aria-label="Aperçu de ta vitrine"
      style={
        colors
          ? ({
              "--preview-primary": colors.primary,
              "--preview-dark": colors.dark,
              "--preview-text": colors.text,
            } as React.CSSProperties)
          : undefined
      }
    >
      <p className={styles.previewLabel}>Ta vitrine, en direct</p>

      <div className={styles.frame}>
        <div className={styles.top}>
          <span className={styles.logo}>{name.charAt(0).toUpperCase()}</span>
          <span>{city ? `Disponible à ${city}` : "Ton adresse en ligne"}</span>
        </div>

        <div className={styles.hero}>
          <small key={`job-${job}-${city}`} className={styles.pop}>
            {job}
            {city ? ` · ${city}` : ""}
          </small>
          <h2 key={`name-${name}`} className={styles.pop}>
            {name}
          </h2>
          <p>
            {state.tone
              ? `Un savoir-faire local, raconté ${state.tone.toLowerCase()}.`
              : "Un savoir-faire local, une expérience simple et un service qui fait la différence."}
          </p>
          <button type="button" tabIndex={-1}>
            Prendre rendez-vous
          </button>
        </div>

        {state.offerTitle.trim() && (
          <div key={`offer-${state.offerTitle}`} className={`${styles.block} ${styles.offer} ${styles.pop}`}>
            <Tag aria-hidden="true" />
            <div>
              <strong>{state.offerTitle}</strong>
              <small>{euros(state.offerPrice)}</small>
            </div>
          </div>
        )}

        {state.productName.trim() && (
          <div key={`product-${state.productName}`} className={`${styles.block} ${styles.pop}`}>
            <div className={styles.blockHead}>
              <Sparkles aria-hidden="true" />
              <strong>{state.categoryName.trim() || "Ton catalogue"}</strong>
            </div>
            <div className={styles.item}>
              <span>{state.productName}</span>
              <b>{euros(state.productPrice)}</b>
            </div>
          </div>
        )}

        {openDays.length > 0 && (
          <div key={`days-${openDays.join()}`} className={`${styles.block} ${styles.pop}`}>
            <div className={styles.blockHead}>
              <CalendarClock aria-hidden="true" />
              <strong>Ouvert</strong>
            </div>
            <div className={styles.days}>
              {openDays.map((day) => (
                <i key={day}>{DAY_LABELS[day]}</i>
              ))}
              <span>
                {state.openingTime} – {state.closingTime}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
