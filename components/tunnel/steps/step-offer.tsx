"use client";

import { BadgeEuro, Tag } from "lucide-react";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";

export type OfferState = {
  offerTitle: string;
  offerDescription: string;
  offerPrice: string;
  offerCompareAt: string;
};

// Étape 4 : l'offre est la carte mise en avant tout en haut de la vitrine.
// C'est le premier élément que voit un client — d'où sa place dans le tunnel.
export function StepOffer({
  state,
  gain,
  onChange,
}: {
  state: OfferState;
  gain: string;
  onChange: (patch: Partial<OfferState>) => void;
}) {
  return (
    <Question
      kicker="Étape 4 · Ton offre"
      title={<>Donne-leur une <em>raison</em> de venir maintenant.</>}
      subtitle="Une offre mise en avant en haut de ta vitrine : une première fois, un pack, une remise de lancement."
      gain={gain}
    >
      <p className={styles.freeBadge}>Offert pendant ton parcours · 15 crédits économisés</p>

      <div className={styles.singleFieldCard}>
        <span>
          <Tag aria-hidden="true" />
        </span>
        <label>
          <span>Titre de l&apos;offre</span>
          <input
            value={state.offerTitle}
            onChange={(event) => onChange({ offerTitle: event.target.value })}
            maxLength={80}
            placeholder="Ex : -20% sur ta première visite"
          />
          <small className={styles.fieldHint}>
            Sois concret : ce que le client gagne, tout de suite.
          </small>
        </label>
      </div>

      <div className={styles.singleFieldCard}>
        <span>
          <Tag aria-hidden="true" />
        </span>
        <label>
          <span>En une phrase (facultatif)</span>
          <input
            value={state.offerDescription}
            onChange={(event) => onChange({ offerDescription: event.target.value })}
            maxLength={300}
            placeholder="Ex : Valable jusqu'à fin du mois, sur rendez-vous."
          />
        </label>
      </div>

      <div className={styles.commerceFields}>
        <label>
          <span className={styles.fieldIcon}>
            <BadgeEuro aria-hidden="true" />
          </span>
          <span>Prix de l&apos;offre</span>
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
          <span>Prix barré (facultatif)</span>
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
