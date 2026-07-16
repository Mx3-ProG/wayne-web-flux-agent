"use client";

import { BriefcaseBusiness, MapPin, Store } from "lucide-react";
import { getVertical } from "@/lib/verticals";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";

// Étape 1 du Parcours : c'est cet écran qui crée réellement la vitrine
// (tunnelCreatePage), d'où le gain affiché.
export function StepIdentity({
  vertical,
  businessName,
  jobTitle,
  city,
  gain,
  onChange,
}: {
  vertical: string;
  businessName: string;
  jobTitle: string;
  city: string;
  gain: string;
  onChange: (patch: { businessName?: string; jobTitle?: string; city?: string }) => void;
}) {
  // Les sous-métiers de la verticale (vertical.jobTitles) : proposés en un clic,
  // jamais imposés — le champ reste libre pour tous les métiers qu'on n'a pas
  // listés.
  const suggestions = vertical ? getVertical(vertical).jobTitles : [];

  return (
    <Question
      kicker="Étape 1 · Ta vitrine"
      title={<>Donnons-lui une <em>adresse.</em></>}
      subtitle="Ces informations créent ta vitrine et préparent ton référencement local. Tout reste modifiable ensuite."
      gain={gain}
    >
      <div className={styles.fields}>
        <label>
          <span>
            Nom du commerce <small>Ton prénom fonctionne aussi</small>
          </span>
          <div>
            <Store aria-hidden="true" />
            <input
              value={businessName}
              onChange={(event) => onChange({ businessName: event.target.value })}
              maxLength={60}
              placeholder="Ex : Atelier Louise"
              autoComplete="organization"
            />
          </div>
        </label>
        <label>
          <span>
            Ton métier <small>Choisis ou écris le tien</small>
          </span>
          <div>
            <BriefcaseBusiness aria-hidden="true" />
            <input
              value={jobTitle}
              onChange={(event) => onChange({ jobTitle: event.target.value })}
              maxLength={60}
              placeholder="Ex : Artisan fleuriste"
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
          <span>Ta ville</span>
          <div>
            <MapPin aria-hidden="true" />
            <input
              value={city}
              onChange={(event) => onChange({ city: event.target.value })}
              maxLength={60}
              placeholder="Ex : Lyon"
              autoComplete="address-level2"
            />
          </div>
        </label>
      </div>
    </Question>
  );
}
