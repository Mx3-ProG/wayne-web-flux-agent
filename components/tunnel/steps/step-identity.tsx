"use client";

import { BriefcaseBusiness, MapPin, Store } from "lucide-react";
import type { LocalizedVertical } from "@/lib/verticals-i18n";
import { Question } from "@/components/tunnel/question";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";
import styles from "@/app/commencer/tunnel.module.css";

// Étape 1 du Parcours : c'est cet écran qui crée réellement la vitrine
// (tunnelCreatePage), d'où le gain affiché.
export function StepIdentity({
  dict,
  vertical,
  businessName,
  jobTitle,
  city,
  gain,
  onChange,
}: {
  dict: TunnelDict["identity"];
  vertical: LocalizedVertical | null;
  businessName: string;
  jobTitle: string;
  city: string;
  gain: string;
  onChange: (patch: { businessName?: string; jobTitle?: string; city?: string }) => void;
}) {
  // Les sous-métiers de la verticale (vertical.jobTitles) : proposés en un clic,
  // jamais imposés — le champ reste libre pour tous les métiers qu'on n'a pas
  // listés.
  const suggestions: string[] = vertical?.jobTitles ?? [];

  return (
    <Question
      kicker={dict.kicker}
      title={<>{dict.titleStart} <em>{dict.titleEm}</em></>}
      subtitle={dict.subtitle}
      gain={gain}
    >
      <div className={styles.fields}>
        <label>
          <span>
            {dict.nameLabel} <small>{dict.nameHint}</small>
          </span>
          <div>
            <Store aria-hidden="true" />
            <input
              value={businessName}
              onChange={(event) => onChange({ businessName: event.target.value })}
              maxLength={60}
              placeholder={dict.namePlaceholder}
              autoComplete="organization"
            />
          </div>
        </label>
        <label>
          <span>
            {dict.jobLabel} <small>{dict.jobHint}</small>
          </span>
          <div>
            <BriefcaseBusiness aria-hidden="true" />
            <input
              value={jobTitle}
              onChange={(event) => onChange({ jobTitle: event.target.value })}
              maxLength={60}
              placeholder={dict.jobPlaceholder}
            />
          </div>
          {suggestions.length > 0 && (
            <div className={styles.suggestions}>
              {suggestions.map((title) => (
                <button
                  className={jobTitle === title ? styles.suggestionActive : styles.suggestion}
                  key={title}
                  type="button"
                  onClick={() => onChange({ jobTitle: title })}
                >
                  {title}
                </button>
              ))}
            </div>
          )}
        </label>
        <label>
          <span>{dict.cityLabel}</span>
          <div>
            <MapPin aria-hidden="true" />
            <input
              value={city}
              onChange={(event) => onChange({ city: event.target.value })}
              maxLength={60}
              placeholder={dict.cityPlaceholder}
              autoComplete="address-level2"
            />
          </div>
        </label>
      </div>
    </Question>
  );
}
