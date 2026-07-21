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
import type { ToolsDict } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import { formatDate as formatLocaleDate } from "@/lib/i18n/format";

function toolName(slug: string): string {
  return TOOLS.find((tool) => tool.slug === slug)?.name ?? slug;
}

// Le coffre-fort : tout ce qui a été créé reste accessible pour toujours.
export function GenerationList({
  generations,
  t,
  locale,
}: {
  generations: Generation[];
  t: ToolsDict;
  locale: Locale;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className={styles.vaultPage}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <span className={styles.overline}>
          <LockKeyhole aria-hidden="true" />
          {t.vault.overline}
        </span>
        <div className={styles.vaultMark} aria-hidden="true">
          <Vault />
        </div>
        <h1>
          {t.vault.titleStart}<span>{t.vault.titleEm}</span>
        </h1>
        <p>
          {generations.length === 0
            ? t.vault.emptySubtitle
            : `${generations.length} ${generations.length > 1 ? t.vault.treasurePlural : t.vault.treasureSingular}`}
        </p>
        {generations.length > 0 && (
          <div className={styles.vaultCount}>
            <Gem aria-hidden="true" />
            <strong>{generations.length}</strong>
            <span>{generations.length > 1 ? t.vault.creationPlural : t.vault.creationSingular}</span>
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
          <p className={styles.emptyKicker}>{t.vault.emptyKicker}</p>
          <h2>{t.vault.emptyTitle}</h2>
          <p>{t.vault.emptyText}</p>
          <Link href="/espace#outils" className={styles.goldAction}>
            {t.vault.createFirst} <ArrowRight aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <section className={styles.collection}>
          <div className={styles.collectionHead}>
            <div>
              <p className={styles.goldLabel}>{t.vault.collectionLabel}</p>
              <h2>{t.vault.collectionTitle}</h2>
            </div>
            <span>{t.vault.sortedHint}</span>
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
                      <small>{t.vault.creationLabel}</small>
                      <strong>{toolName(generation.tool_slug)}</strong>
                      <span>
                        {formatLocaleDate(locale, generation.created_at)} ·{" "}
                        {t.vault.creditsSpent.replace("{cost}", String(generation.credits_spent))}
                      </span>
                    </span>
                    <span className={styles.openControl}>
                      {open ? t.vault.close : t.vault.discover}
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
                          toast.success(t.vault.copiedToast);
                        }}
                      >
                        <Copy aria-hidden="true" />
                        {t.vault.copyCreation}
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
