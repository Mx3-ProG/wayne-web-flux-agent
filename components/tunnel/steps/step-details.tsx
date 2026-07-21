"use client";

import { MapPin, Phone } from "lucide-react";
import type { LocalizedFont } from "@/lib/verticals-i18n";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";

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
  dict,
  fonts,
  state,
  onChange,
}: {
  dict: TunnelDict["details"];
  fonts: LocalizedFont[];
  state: DetailsState;
  onChange: (patch: Partial<DetailsState>) => void;
}) {
  return (
    <Question
      kicker={dict.kicker}
      title={<>{dict.titleStart} <em>{dict.titleEm}</em></>}
      subtitle={dict.subtitle}
    >
      <div className={styles.fields}>
        <label>
          <span>{dict.fontLabel}</span>
          <div>
            <select
              className={styles.select}
              value={state.font}
              onChange={(event) => onChange({ font: event.target.value })}
            >
              {fonts.map((font) => (
                <option key={font.id} value={font.id}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>
        </label>

        <div className={styles.colorFields}>
          <label>
            <span>{dict.primaryLabel}</span>
            <input
              type="color"
              value={state.primary || "#ef233c"}
              onChange={(event) => onChange({ primary: event.target.value })}
            />
          </label>
          <label>
            <span>{dict.darkLabel}</span>
            <input
              type="color"
              value={state.dark || "#111114"}
              onChange={(event) => onChange({ dark: event.target.value })}
            />
          </label>
        </div>

        <label>
          <span>
            {dict.phoneLabel} <small>{dict.optional}</small>
          </span>
          <div>
            <Phone aria-hidden="true" />
            <input
              value={state.phone}
              onChange={(event) => onChange({ phone: event.target.value })}
              maxLength={30}
              placeholder={dict.phonePlaceholder}
              autoComplete="tel"
            />
          </div>
        </label>

        <label>
          <span>
            {dict.addressLabel} <small>{dict.optional}</small>
          </span>
          <div>
            <MapPin aria-hidden="true" />
            <input
              value={state.address}
              onChange={(event) => onChange({ address: event.target.value })}
              maxLength={120}
              placeholder={dict.addressPlaceholder}
              autoComplete="street-address"
            />
          </div>
        </label>
      </div>
    </Question>
  );
}
