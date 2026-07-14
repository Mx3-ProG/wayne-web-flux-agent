import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Coins, Gem, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { CREDIT_PACKS, packUnitPrice } from "@/lib/credit-packs";
import { FLUX_PLANS, PLAN_LABEL, PLAN_LIMITS, TRIAL_DAYS } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import { FluxBrand } from "@/components/flux-brand";
import { MarketingFooter } from "@/components/marketing-footer";
import styles from "./pricing.module.css";

export const metadata: Metadata = {
  title: "Tarifs et crédits",
  description: "Découvre les abonnements FLUX et les packs de crédits pour développer la présence digitale de ton commerce.",
};

const FEATURES: Record<Plan, string[]> = {
  basique: ["Personnalisation essentielle", "Adresse FLUX incluse", "Outils FLUX inclus"],
  pro: ["Personnalisation avancée", "Thèmes premium", "Outils FLUX inclus"],
  business: ["Domaine personnalisé", "Sans branding Wayne Web", "Thèmes premium"],
  entreprise: ["10 vitrines professionnelles", "Domaine personnalisé", "Sans branding Wayne Web"],
};

export default function PricingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="Wayne Web Flux, accueil"><FluxBrand priority /></Link>
        <nav><Link href="/">Accueil</Link><Link href="/pricing" aria-current="page">Tarifs</Link><Link href="/login">Connexion</Link></nav>
        <Link className={`flux-button-smooth ${styles.headerCta}`} href="/commencer">Essayer gratuitement</Link>
      </header>

      <main>
        <section className={styles.hero}>
          <p className={styles.eyebrow}><Sparkles aria-hidden="true" /> Des tarifs nets. Aucun coût caché.</p>
          <h1>Choisis le rythme de<br /><em>ta croissance.</em></h1>
          <p>Un abonnement pour faire tourner ton espace. Des crédits pour créer, publier et accélérer quand tu en as besoin.</p>
          <div className={styles.heroFacts}>
            <span><Check /> {TRIAL_DAYS} jours d’essai</span>
            <span><Check /> Résiliable à tout moment</span>
            <span><Check /> Paiement sécurisé par Stripe</span>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="plans-title">
          <div className={styles.sectionHeading}>
            <div><p>Abonnements mensuels</p><h2 id="plans-title">Une formule pour chaque ambition.</h2></div>
            <span>Les crédits mensuels non utilisés s’additionnent.</span>
          </div>
          <div className={styles.planGrid}>
            {FLUX_PLANS.map((plan) => {
              const limits = PLAN_LIMITS[plan];
              const featured = plan === "business";
              return (
                <article className={featured ? styles.planFeatured : styles.plan} key={plan}>
                  <div className={styles.planTop}>
                    <span>{PLAN_LABEL[plan]}</span>
                    {featured && <small>Le plus choisi</small>}
                  </div>
                  <p className={styles.price}><strong>{limits.priceEur} €</strong><span>/ mois</span></p>
                  <p className={styles.creditLine}><Coins aria-hidden="true" /> {limits.monthlyCredits} crédits inclus / mois</p>
                  <ul>
                    <li><Check /> {limits.projects} vitrine{limits.projects > 1 ? "s" : ""}</li>
                    <li><Check /> {limits.offers} offres actives</li>
                    <li><Check /> {limits.subpages} sous-pages par vitrine</li>
                    {FEATURES[plan].map((feature) => <li key={feature}><Check /> {feature}</li>)}
                  </ul>
                  <Link className={`flux-button-smooth ${styles.planCta}`} href={`/checkout/formule/${plan}`}>
                    Choisir {PLAN_LABEL[plan]} <ArrowRight aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
          <p className={styles.checkoutNote}><ShieldCheck aria-hidden="true" /> Tu te connecteras ou créeras ton compte avant le paiement. L’abonnement est activé après confirmation Stripe.</p>
        </section>

        <section className={`${styles.section} ${styles.creditsSection}`} aria-labelledby="credits-title">
          <div className={styles.sectionHeading}>
            <div><p>Recharges ponctuelles</p><h2 id="credits-title">Besoin d’un coup d’accélérateur ?</h2></div>
            <span>Sans abonnement supplémentaire. Sans renouvellement automatique.</span>
          </div>
          <div className={styles.packGrid}>
            {CREDIT_PACKS.map((pack) => (
              <article className={pack.featured ? styles.packFeatured : styles.pack} key={pack.id}>
                <div className={styles.packIcon}>{pack.featured ? <Zap /> : <Gem />}</div>
                <div className={styles.packName}><p>{pack.label}</p>{pack.discountLabel && <small>{pack.discountLabel}</small>}</div>
                <strong>{pack.credits}<span> crédits</span></strong>
                <p>{(pack.priceCents / 100).toLocaleString("fr-FR")} € <small>· {packUnitPrice(pack)} € / crédit</small></p>
                <Link className="flux-button-smooth" href={`/checkout/credits/${pack.id}`}>Acheter ce pack <ArrowRight /></Link>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.explainer}>
          <div><p>Comment ça marche ?</p><h2>L’abonnement donne accès.<br />Les crédits font avancer.</h2></div>
          <ol>
            <li><span>01</span><div><strong>Choisis ta formule</strong><p>Elle détermine le nombre de vitrines, d’offres et les fonctionnalités disponibles.</p></div></li>
            <li><span>02</span><div><strong>Utilise tes crédits</strong><p>Ils servent aux générations, publications et actions qui mobilisent les outils FLUX.</p></div></li>
            <li><span>03</span><div><strong>Recharge si nécessaire</strong><p>Ajoute un pack ponctuel à ton solde, sans modifier ton abonnement.</p></div></li>
          </ol>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
