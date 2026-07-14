"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ChartLine, Globe2, HeartHandshake } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { FluxBrand } from "@/components/flux-brand";
import styles from "@/components/commerce/setup-tunnel.module.css";

// Mini tunnel avant les statistiques : rappelle que les stats se nourrissent
// du partage du lien, puis remercie l'utilisateur avant d'ouvrir le tableau
// de bord (/statistiques?view=stats).
export function StatsTunnel({ pageUrl }: { pageUrl: string }) {
  const [step, setStep] = useState(0);

  return (
    <div className={styles.tunnel}>
      <header className={styles.header}>
        <Link href="/espace" className={styles.brand}><FluxBrand /></Link>
        <div className={styles.progressMeta}>
          <span>Étape {step + 1} sur 2</span>
          <div className={styles.progress}><i style={{ width: `${((step + 1) / 2) * 100}%` }} /></div>
        </div>
        <Link href="/statistiques?view=stats" className={styles.exit}>Mes statistiques</Link>
      </header>

      <main className={styles.stage}>
        {step === 0 && (
          <section className={styles.screen}>
            <p className={styles.kicker}>Fais circuler ton lien</p>
            <h1>Tes statistiques commencent par un <em>partage.</em></h1>
            <p className={styles.subtitle}>
              Partage ton lien aux personnes qui apprécient ton travail, y
              trouvent de la valeur ou du réconfort. Chaque visite, chaque clic
              et chaque abonné apparaîtra ici — plus ton lien circule, plus tes
              chiffres racontent ton histoire.
            </p>
            <div className={styles.reviewGrid}>
              <article className={styles.reviewCard}>
                <small><Globe2 aria-hidden="true" style={{ width: 13, verticalAlign: "-2px", marginRight: 6 }} />Ton lien unique</small>
                <strong style={{ wordBreak: "break-all" }}>{pageUrl}</strong>
              </article>
            </div>
            <div className={styles.confirm}>
              <CopyButton text={pageUrl} label="Copier mon lien" />
              <button className={`flux-button-smooth ${styles.primary}`} type="button" onClick={() => setStep(1)}>
                Continuer <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className={styles.intro}>
            <span className={styles.icon}><HeartHandshake aria-hidden="true" /></span>
            <p className={styles.kicker}>De la part de toute l&apos;équipe</p>
            <h1>Merci d&apos;utiliser FLUX pour <em>tes affaires.</em></h1>
            <p>
              Ton commerce mérite d&apos;être vu, choisi et recommandé. On te
              souhaite d&apos;accomplir de grandes choses — et on sera là pour
              compter chaque victoire avec toi.
            </p>
            <div className={styles.confirm}>
              <button className={styles.back} type="button" onClick={() => setStep(0)}>
                <ArrowLeft aria-hidden="true" /> Retour
              </button>
              <Link href="/statistiques?view=stats" className={`flux-button-smooth ${styles.primary}`} style={{ textDecoration: "none" }}>
                <ChartLine aria-hidden="true" style={{ width: 16 }} /> Voir mes statistiques
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
