"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock3, Globe2, RotateCcw, Search, Users } from "lucide-react";
import styles from "@/app/home.module.css";

const PILLARS = [
  {
    number: "01",
    icon: Clock3,
    title: "Gagne du temps",
    text: "Posts, réponses clients et contenus prêts à publier. Tu gardes ta voix, tu récupères tes soirées.",
    tag: "Outils de gains de temps",
    sales:
      "Tes soirées n’ont pas à disparaître dans des tâches répétitives. Laisse Flux travailler pendant que tu retrouves du temps pour ton métier — et pour toi.",
  },
  {
    number: "02",
    icon: Search,
    title: "Sois trouvé sur Google",
    text: "Une présence locale claire, des textes optimisés et une fiche Google qui travaille pour ton commerce.",
    tag: "Boost ton commerce",
    sales:
      "Quelqu’un cherche exactement ce que tu proposes, aujourd’hui. Donne enfin à ton commerce la visibilité qui transforme cette recherche en visite.",
  },
  {
    number: "03",
    icon: Users,
    title: "Transforme les vues en clients",
    text: "Une vitrine qui rassure, un parcours simple et des rendez-vous qui arrivent sans courir après les prospects.",
    tag: "Génère des leads",
    sales:
      "Une vue oubliée ne paie aucune facture. Avec le bon parcours, chaque visite peut devenir une conversation, puis un vrai client.",
  },
  {
    number: "04",
    icon: Globe2,
    title: "Pilote tout au même endroit",
    text: "Page, agenda, messages et visibilité réunis dans un espace pensé pour les professionnels de terrain.",
    tag: "Solution tout-en-un",
    sales:
      "Moins d’onglets, moins de charge mentale, plus de maîtrise. Ton activité mérite un espace aussi clair et sérieux que ton savoir-faire.",
  },
];

export function PillarGrid() {
  const [flipped, setFlipped] = useState<string[]>([]);

  function toggle(number: string) {
    setFlipped((current) =>
      current.includes(number)
        ? current.filter((item) => item !== number)
        : [...current, number]
    );
  }

  return (
    <div className={styles.pillarGrid}>
      {PILLARS.map((pillar) => {
        const Icon = pillar.icon;
        const isFlipped = flipped.includes(pillar.number);

        return (
          <article
            key={pillar.number}
            className={`${styles.pillar} ${isFlipped ? styles.pillarFlipped : ""}`}
          >
            <div className={styles.pillarInner}>
              <button
                className={styles.pillarFront}
                type="button"
                onClick={() => toggle(pillar.number)}
                aria-label={`${pillar.title}. Afficher la suite.`}
                aria-expanded={isFlipped}
                tabIndex={isFlipped ? -1 : 0}
              >
                <span className={styles.pillarTop}>
                  <span>{pillar.number}</span>
                  <Icon aria-hidden="true" />
                </span>
                <span className={styles.pillarContent}>
                  <span className={styles.pillarTag}>{pillar.tag}</span>
                  <strong>{pillar.title}</strong>
                  <span>{pillar.text}</span>
                </span>
                <small>Appuie pour découvrir</small>
              </button>

              <div className={styles.pillarBack} aria-hidden={!isFlipped}>
                <span className={styles.pillarBackIcon}><Icon aria-hidden="true" /></span>
                <p>{pillar.sales}</p>
                <Link href="/commencer" tabIndex={isFlipped ? 0 : -1}>
                  Créer mon espace <span>→</span>
                </Link>
                <button type="button" tabIndex={isFlipped ? 0 : -1} onClick={() => toggle(pillar.number)}>
                  <RotateCcw aria-hidden="true" /> Revenir
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
