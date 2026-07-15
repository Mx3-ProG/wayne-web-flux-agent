"use client";

import { BadgeEuro, Boxes, PackagePlus } from "lucide-react";
import { catalogWording, type VerticalKind } from "@/lib/verticals";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";

export type CatalogState = {
  categoryName: string;
  productName: string;
  productPrice: string;
  trackStock: boolean;
  productStock: string;
};

// Étape 3 : tronc commun pour toutes les verticales (une seule table products
// derrière), mais le vocabulaire suit le métier — un coiffeur crée une
// « prestation », pas un « produit ». Le suivi de stock disparaît pour les
// métiers de service : une prestation ne s'épuise pas.
export function StepCatalog({
  kind,
  state,
  gain,
  onChange,
}: {
  kind: VerticalKind;
  state: CatalogState;
  gain: string;
  onChange: (patch: Partial<CatalogState>) => void;
}) {
  const words = catalogWording(kind);

  return (
    <Question
      kicker="Étape 3 · Ton catalogue"
      title={<>Qu&apos;est-ce que tu veux <em>vendre en premier ?</em></>}
      subtitle={`Une ${words.categoryWord} et ta première ${words.itemWord}. C'est le minimum pour qu'un client comprenne ce que tu proposes.`}
      gain={gain}
    >
      <p className={styles.freeBadge}>Offert pendant ton parcours · 15 crédits économisés</p>

      <div className={styles.singleFieldCard}>
        <span>
          <Boxes aria-hidden="true" />
        </span>
        <label>
          <span>Nom de la {words.categoryWord}</span>
          <input
            value={state.categoryName}
            onChange={(event) => onChange({ categoryName: event.target.value })}
            maxLength={60}
            placeholder={words.categoryPlaceholder}
          />
          <small className={styles.fieldHint}>{words.categoryHint}</small>
        </label>
      </div>

      <div className={styles.singleFieldCard}>
        <span>
          <PackagePlus aria-hidden="true" />
        </span>
        <label>
          <span>
            Nom de ta {words.itemWord}
            {state.categoryName.trim() ? ` dans « ${state.categoryName.trim()} »` : ""}
          </span>
          <input
            value={state.productName}
            onChange={(event) => onChange({ productName: event.target.value })}
            maxLength={100}
            placeholder={words.itemPlaceholder}
          />
          <small className={styles.fieldHint}>{words.itemHint}</small>
        </label>
      </div>

      <div className={styles.commerceFields}>
        <label>
          <span className={styles.fieldIcon}>
            <BadgeEuro aria-hidden="true" />
          </span>
          <span>Prix TTC</span>
          <div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={state.productPrice}
              onChange={(event) => onChange({ productPrice: event.target.value })}
              placeholder="49,00"
            />
            <b>€</b>
          </div>
        </label>

        {words.showStock ? (
          <div className={styles.stockCard}>
            <button
              type="button"
              className={state.trackStock ? styles.stockToggleActive : styles.stockToggle}
              onClick={() => onChange({ trackStock: !state.trackStock })}
              aria-pressed={state.trackStock}
            >
              <span>
                <strong>Suivre le stock</strong>
                <small>FLUX t&apos;alerte quand il est épuisé.</small>
              </span>
              <i />
            </button>
            {state.trackStock && (
              <label>
                <span>Quantité disponible</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={state.productStock}
                  onChange={(event) => onChange({ productStock: event.target.value })}
                />
              </label>
            )}
          </div>
        ) : (
          <div className={styles.stockCard}>
            <p className={styles.fieldHint}>
              Pas de stock à suivre pour une prestation : tes clients réservent
              un créneau, que tu régleras à l&apos;étape agenda.
            </p>
          </div>
        )}
      </div>
    </Question>
  );
}
