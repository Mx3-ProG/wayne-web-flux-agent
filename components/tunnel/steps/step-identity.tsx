"use client";

import { BriefcaseBusiness, MapPin, Store } from "lucide-react";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";

// Étape 1 du Parcours : c'est cet écran qui crée réellement la vitrine
// (tunnelCreatePage), d'où le gain affiché.
export function StepIdentity({
  businessName,
  jobTitle,
  city,
  gain,
  onChange,
}: {
  businessName: string;
  jobTitle: string;
  city: string;
  gain: string;
  onChange: (patch: { businessName?: string; jobTitle?: string; city?: string }) => void;
}) {
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
          <span>Ton métier</span>
          <div>
            <BriefcaseBusiness aria-hidden="true" />
            <input
              value={jobTitle}
              onChange={(event) => onChange({ jobTitle: event.target.value })}
              maxLength={60}
              placeholder="Ex : Artisan fleuriste"
            />
          </div>
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
