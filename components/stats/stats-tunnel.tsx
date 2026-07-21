"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ChartLine, Globe2, HeartHandshake } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { FluxBrand } from "@/components/flux-brand";
import type { AnalyticsDict } from "@/lib/i18n/get-dictionary";
import styles from "@/components/commerce/setup-tunnel.module.css";

// Mini tunnel avant les statistiques : rappelle que les stats se nourrissent
// du partage du lien, puis remercie l'utilisateur avant d'ouvrir le tableau
// de bord (/statistiques?view=stats).
export function StatsTunnel({ pageUrl, t }: { pageUrl: string; t: AnalyticsDict["tunnel"] }) {
  const [step, setStep] = useState(0);

  return (
    <div className={styles.tunnel}>
      <header className={styles.header}>
        <Link href="/espace" className={styles.brand}><FluxBrand /></Link>
        <div className={styles.progressMeta}>
          <span>{t.step.replace("{current}", String(step + 1)).replace("{total}", "2")}</span>
          <div className={styles.progress}><i style={{ width: `${((step + 1) / 2) * 100}%` }} /></div>
        </div>
        <Link href="/statistiques?view=stats" className={styles.exit}>{t.exit}</Link>
      </header>

      <main className={styles.stage}>
        {step === 0 && (
          <section className={styles.screen}>
            <p className={styles.kicker}>{t.kicker1}</p>
            <h1>{t.title1Start} <em>{t.title1Em}</em></h1>
            <p className={styles.subtitle}>{t.subtitle1}</p>
            <div className={styles.reviewGrid}>
              <article className={styles.reviewCard}>
                <small><Globe2 aria-hidden="true" style={{ width: 13, verticalAlign: "-2px", marginRight: 6 }} />{t.uniqueLink}</small>
                <strong style={{ wordBreak: "break-all" }}>{pageUrl}</strong>
              </article>
            </div>
            <div className={styles.confirm}>
              <CopyButton text={pageUrl} label={t.copyLink} />
              <button className={`flux-button-smooth ${styles.primary}`} type="button" onClick={() => setStep(1)}>
                {t.continueCta} <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className={styles.intro}>
            <span className={styles.icon}><HeartHandshake aria-hidden="true" /></span>
            <p className={styles.kicker}>{t.fromTeam}</p>
            <h1>{t.title2Start} <em>{t.title2Em}</em></h1>
            <p>{t.text2}</p>
            <div className={styles.confirm}>
              <button className={styles.back} type="button" onClick={() => setStep(0)}>
                <ArrowLeft aria-hidden="true" /> {t.back}
              </button>
              <Link href="/statistiques?view=stats" className={`flux-button-smooth ${styles.primary}`} style={{ textDecoration: "none" }}>
                <ChartLine aria-hidden="true" style={{ width: 16 }} /> {t.viewStats}
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
