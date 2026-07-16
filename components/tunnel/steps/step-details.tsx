"use client";

import { MapPin, Phone } from "lucide-react";
import { FONTS } from "@/lib/verticals";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";

export type DetailsState = {
  font: string;
  primary: string;
  dark: string;
  phone: string;
  address: string;
};

// Repris de l'écran « Les détails » de l'assistant vitrine (/ma-page). Les
// couleurs partent de celles du style choisi à l'écran précédent : on affine,
// on ne repart pas d'une page blanche.
export function StepDetails({
  state,
  onChange,
}: {
  state: DetailsState;
  onChange: (patch: Partial<DetailsState>) => void;
}) {
  return (
    <Question
      kicker="Ton style · Les détails"
      title={<>Affine, et dis-leur comment te <em>joindre.</em></>}
      subtitle="Ton écriture, tes couleurs et tes coordonnées. Le style que tu viens de choisir a déjà tout pré-réglé."
    >
      <div className={styles.fields}>
        <label>
          <span>Style d&apos;écriture</span>
          <div>
            <select
              className={styles.select}
              value={state.font}
              onChange={(event) => onChange({ font: event.target.value })}
            >
              {FONTS.map((font) => (
                <option key={font.id} value={font.id}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>
        </label>

        <div className={styles.colorFields}>
          <label>
            <span>Couleur principale</span>
            <input
              type="color"
              value={state.primary || "#ef233c"}
              onChange={(event) => onChange({ primary: event.target.value })}
            />
          </label>
          <label>
            <span>Couleur foncée</span>
            <input
              type="color"
              value={state.dark || "#111114"}
              onChange={(event) => onChange({ dark: event.target.value })}
            />
          </label>
        </div>

        <label>
          <span>
            Téléphone <small>Facultatif</small>
          </span>
          <div>
            <Phone aria-hidden="true" />
            <input
              value={state.phone}
              onChange={(event) => onChange({ phone: event.target.value })}
              maxLength={30}
              placeholder="Ex : 06 12 34 56 78"
              autoComplete="tel"
            />
          </div>
        </label>

        <label>
          <span>
            Adresse <small>Facultatif</small>
          </span>
          <div>
            <MapPin aria-hidden="true" />
            <input
              value={state.address}
              onChange={(event) => onChange({ address: event.target.value })}
              maxLength={120}
              placeholder="Ex : 12 rue des Lilas"
              autoComplete="street-address"
            />
          </div>
        </label>
      </div>
    </Question>
  );
}
