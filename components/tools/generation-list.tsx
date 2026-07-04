"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Generation } from "@/lib/types";
import { TOOLS } from "@/lib/tools-config";
import {
  ArrowRight,
  ChevronDown,
  Copy,
  Gem,
  LockKeyhole,
  ScrollText,
  Sparkles,
  Vault,
} from "lucide-react";
import styles from "./generation-list.module.css";

function toolName(slug: string): string {
  return TOOLS.find((tool) => tool.slug === slug)?.name ?? slug;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

// Le coffre-fort : tout ce qui a été créé reste accessible pour toujours.
export function GenerationList({ generations }: { generations: Generation[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className={styles.vaultPage}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <span className={styles.overline}>
          <LockKeyhole aria-hidden="true" />
          Chambre forte personnelle
        </span>
        <div className={styles.vaultMark} aria-hidden="true">
          <Vault />
        </div>
        <h1>
          Ton coffre-<span>fort</span>
        </h1>
        <p>
          {generations.length === 0
            ? "Chaque création précieuse trouvera sa place ici."
            : `${generations.length} trésor${generations.length > 1 ? "s" : ""} façonné${generations.length > 1 ? "s" : ""} par FLUX, conservé${generations.length > 1 ? "s" : ""} pour toujours.`}
        </p>
        {generations.length > 0 && (
          <div className={styles.vaultCount}>
            <Gem aria-hidden="true" />
            <strong>{generations.length}</strong>
            <span>création{generations.length > 1 ? "s" : ""} en sûreté</span>
          </div>
        )}
      </header>

      {generations.length === 0 ? (
        <section className={styles.empty}>
          <div className={styles.emptyVisual} aria-hidden="true">
            <span className={styles.orbitOne}><ScrollText /></span>
            <span className={styles.orbitTwo}><Sparkles /></span>
            <span className={styles.orbitThree}><Gem /></span>
            <span className={styles.emptyVault}><Vault /></span>
          </div>
          <p className={styles.emptyKicker}>Le premier trésor t’attend</p>
          <h2>Ton savoir-faire mérite son écrin.</h2>
          <p>
            Crée ton premier contenu avec FLUX. Il sera rangé ici,
            prêt à être relu, copié et partagé.
          </p>
          <Link href="/espace#outils" className={styles.goldAction}>
            Créer mon premier contenu <ArrowRight aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <section className={styles.collection}>
          <div className={styles.collectionHead}>
            <div>
              <p className={styles.goldLabel}>Ta collection</p>
              <h2>Des pièces uniques, prêtes à rayonner.</h2>
            </div>
            <span>Classées de la plus récente à la plus ancienne</span>
          </div>

          <div className={styles.grid}>
            {generations.map((generation, index) => {
              const open = openId === generation.id;
              return (
                <article
                  key={generation.id}
                  className={open ? styles.treasureOpen : styles.treasure}
                >
                  <button
                    type="button"
                    className={styles.treasureTrigger}
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : generation.id)}
                  >
                    <span className={styles.treasureNumber}>
                      {String(generations.length - index).padStart(2, "0")}
                    </span>
                    <span className={styles.treasureIcon}>
                      <ScrollText aria-hidden="true" />
                    </span>
                    <span className={styles.treasureTitle}>
                      <small>Création FLUX</small>
                      <strong>{toolName(generation.tool_slug)}</strong>
                      <span>
                        {formatDate(generation.created_at)} · {generation.credits_spent} crédits
                      </span>
                    </span>
                    <span className={styles.openControl}>
                      {open ? "Refermer" : "Découvrir"}
                      <ChevronDown aria-hidden="true" />
                    </span>
                  </button>

                  {open && (
                    <div className={styles.treasureContent}>
                      <div className={styles.contentPaper}>{generation.output}</div>
                      <button
                        type="button"
                        className={styles.copyButton}
                        onClick={() => {
                          void navigator.clipboard.writeText(generation.output);
                          toast.success("Création copiée !");
                        }}
                      >
                        <Copy aria-hidden="true" />
                        Copier cette création
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
