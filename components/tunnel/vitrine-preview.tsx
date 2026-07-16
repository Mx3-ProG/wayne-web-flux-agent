"use client";

import Image from "next/image";
import { CalendarClock, Sparkles, Tag } from "lucide-react";
import { getFont, getVertical } from "@/lib/verticals";
import { DESIGN_KIT_BY_ID } from "@/lib/vitrine-design/registry";
import styles from "./vitrine-preview.module.css";

export type PreviewState = {
  vertical: string;
  // Kit de design choisi à l'écran « Choisis ton style ». Vide tant qu'on n'y
  // est pas passé : l'aperçu vit alors sur la palette de la verticale.
  theme: string;
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
  // Écrans « images » et « détails », repris de l'assistant vitrine. Vides tant
  // qu'on n'y est pas passé.
  logoUrl: string;
  heroUrl: string;
  font: string;
  // Réglées à la main par-dessus le style choisi : elles gagnent donc sur le kit
  // ET sur la verticale, comme dans l'éditeur.
  primary: string;
  dark: string;
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
  // Le kit choisi prime sur la palette de la verticale : c'est exactement ce que
  // fait designKitPatch côté vitrine réelle, où theme écrase colors.
  const kit = state.theme ? DESIGN_KIT_BY_ID.get(state.theme) : undefined;
  const base = kit?.defaults.colors ?? vertical?.defaultColors;
  // Priorité : réglage manuel > kit > verticale.
  const colors = base && {
    ...base,
    ...(state.primary ? { primary: state.primary } : {}),
    ...(state.dark ? { dark: state.dark } : {}),
  };
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
              // Seuls les kits portent un fond et une carte. Sans kit, les
              // valeurs par défaut du CSS gardent l'aperçu clair, comme avant.
              ...(kit
                ? {
                    "--preview-bg": kit.defaults.colors.background,
                    "--preview-card": kit.defaults.colors.card,
                    // Sur un kit sombre, `dark` est quasiment la couleur du
                    // fond : le bouton s'y effacerait. La vitrine réelle prend
                    // de toute façon `primary` comme accent de CTA.
                    "--preview-cta": colors.primary,
                  }
                : {}),
              ...(state.font ? { "--preview-font": getFont(state.font).css } : {}),
            } as React.CSSProperties)
          : undefined
      }
    >
      <p className={styles.previewLabel}>Ta vitrine, en direct</p>

      <div className={styles.frame}>
        <div className={styles.top}>
          {/* unoptimized : même traitement que l'assistant vitrine — l'URL sort
              du bucket Supabase et l'aperçu fait 27px de côté. */}
          <span className={styles.logo}>
            {state.logoUrl ? (
              <Image key={state.logoUrl} src={state.logoUrl} width={54} height={54} unoptimized alt="" />
            ) : (
              name.charAt(0).toUpperCase()
            )}
          </span>
          <span>{city ? `Disponible à ${city}` : "Ton adresse en ligne"}</span>
        </div>

        <div
          className={state.heroUrl ? `${styles.hero} ${styles.heroPhoto}` : styles.hero}
          style={
            state.heroUrl
              ? ({ "--preview-hero": `url(${JSON.stringify(state.heroUrl)})` } as React.CSSProperties)
              : undefined
          }
        >
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
