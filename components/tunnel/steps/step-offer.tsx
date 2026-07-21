"use client";

import { BadgeEuro, Tag } from "lucide-react";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";

export type OfferState = {
  offerTitle: string;
  offerDescription: string;
  offerPrice: string;
  offerCompareAt: string;
};

// Étape 4 : l'offre est la carte mise en avant tout en haut de la vitrine.
// C'est le premier élément que voit un client — d'où sa place dans le tunnel.
export function StepOffer({
  dict,
  state,
  gain,
  onChange,
}: {
  dict: TunnelDict["offer"];
  state: OfferState;
  gain: string;
  onChange: (patch: Partial<OfferState>) => void;
}) {
  return (
    <Question
      kicker={dict.kicker}
      title={<>{dict.titleStart} <em>{dict.titleEm}</em> {dict.titleEnd}</>}
      subtitle={dict.subtitle}
      gain={gain}
    >
      <p className={styles.freeBadge}>{dict.freeBadge}</p>

      <div className={styles.singleFieldCard}>
        <span>
          <Tag aria-hidden="true" />
        </span>
        <label>
          <span>{dict.titleLabel}</span>
          <input
            value={state.offerTitle}
            onChange={(event) => onChange({ offerTitle: event.target.value })}
            maxLength={80}
            placeholder={dict.titlePlaceholder}
          />
          <small className={styles.fieldHint}>
            {dict.titleHint}
          </small>
        </label>
      </div>

      <div className={styles.singleFieldCard}>
        <span>
          <Tag aria-hidden="true" />
        </span>
        <label>
          <span>{dict.descriptionLabel}</span>
          <input
            value={state.offerDescription}
            onChange={(event) => onChange({ offerDescription: event.target.value })}
            maxLength={300}
            placeholder={dict.descriptionPlaceholder}
          />
        </label>
      </div>

      <div className={styles.commerceFields}>
        <label>
          <span className={styles.fieldIcon}>
            <BadgeEuro aria-hidden="true" />
          </span>
          <span>{dict.priceLabel}</span>
          <div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={state.offerPrice}
              onChange={(event) => onChange({ offerPrice: event.target.value })}
              placeholder="39,00"
            />
            <b>€</b>
          </div>
        </label>
        <label>
          <span className={styles.fieldIcon}>
            <BadgeEuro aria-hidden="true" />
          </span>
          <span>{dict.compareAtLabel}</span>
          <div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={state.offerCompareAt}
              onChange={(event) => onChange({ offerCompareAt: event.target.value })}
              placeholder="49,00"
            />
            <b>€</b>
          </div>
        </label>
      </div>
    </Question>
  );
}
