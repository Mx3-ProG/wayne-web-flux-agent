"use client";

import { BadgeEuro, Boxes, PackagePlus } from "lucide-react";
import type { CatalogWording } from "@/lib/verticals-i18n";
import { Question } from "@/components/tunnel/question";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";
import styles from "@/app/commencer/tunnel.module.css";

export type CatalogState = {
  categoryName: string;
  productName: string;
  productPrice: string;
  trackStock: boolean;
  productStock: string;
};

function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
}

// Étape 3 : tronc commun pour toutes les verticales (une seule table products
// derrière), mais le vocabulaire suit le métier — un coiffeur crée une
// « prestation », pas un « produit ». Le suivi de stock disparaît pour les
// métiers de service : une prestation ne s'épuise pas.
//
// words vient du dictionnaire i18n "verticals" (lib/verticals-i18n.ts),
// résolu côté serveur pour la locale du compte et transmis en prop.
export function StepCatalog({
  dict,
  words,
  state,
  gain,
  onChange,
}: {
  dict: TunnelDict["catalog"];
  words: CatalogWording;
  state: CatalogState;
  gain: string;
  onChange: (patch: Partial<CatalogState>) => void;
}) {
  return (
    <Question
      kicker={dict.kicker}
      title={<>{dict.titleStart} <em>{dict.titleEm}</em></>}
      subtitle={fillTemplate(dict.subtitle, {
        categoryWord: words.categoryWord,
        itemWord: words.itemWord,
      })}
      gain={gain}
    >
      <p className={styles.freeBadge}>{dict.freeBadge}</p>

      <div className={styles.singleFieldCard}>
        <span>
          <Boxes aria-hidden="true" />
        </span>
        <label>
          <span>{fillTemplate(dict.categoryLabel, { categoryWord: words.categoryWord })}</span>
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
            {state.categoryName.trim()
              ? fillTemplate(dict.itemLabelWithCategory, {
                  itemWord: words.itemWord,
                  category: state.categoryName.trim(),
                })
              : fillTemplate(dict.itemLabel, { itemWord: words.itemWord })}
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
          <span>{dict.priceLabel}</span>
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
                <strong>{dict.trackStock}</strong>
                <small>{dict.trackStockHint}</small>
              </span>
              <i />
            </button>
            {state.trackStock && (
              <label>
                <span>{dict.stockLabel}</span>
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
            <p className={styles.fieldHint}>{dict.noStockHint}</p>
          </div>
        )}
      </div>
    </Question>
  );
}
