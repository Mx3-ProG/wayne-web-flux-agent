import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  FLUX_PLANS,
  PLAN_LABEL,
  PLAN_LIMITS,
  PUBLISH_COST,
  TRIAL_DAYS,
  hasActiveAccess,
  trialDaysLeft,
} from "@/lib/plans";
import type { Plan, Profile } from "@/lib/types";
import {
  ArrowRight,
  Check,
  Crown,
  Gem,
  LockKeyhole,
  Sparkles,
  WalletCards,
} from "lucide-react";
import styles from "./formules.module.css";

export const metadata = { title: "Formules FLUX" };

// Fonctionnalités marketing par palier (en plus des limites chiffrées).
const PLAN_FEATURES: Record<Plan, string[]> = {
  basique: ["Personnalisation de base", "Outils FLUX inclus"],
  pro: [
    "Personnalisation avancée (sections, blocs)",
    "Thèmes premium",
    "Outils FLUX inclus",
  ],
  business: [
    "Personnalisation avancée (sections, blocs)",
    "Thèmes premium",
    "Sans branding Wayne Web",
    "Outils FLUX inclus",
  ],
  entreprise: [
    "Toute la personnalisation, sans limite d'ambition",
    "Thèmes premium",
    "Sans branding Wayne Web",
    "Outils FLUX inclus",
  ],
};

// Pricing des formules FLUX. Les CTA créent une session Stripe Checkout côté
// serveur; l'activation effective reste exclusivement pilotée par les webhooks.
export default async function FormulesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, trial_ends_at, subscribed_at, subscription_status")
    .eq("user_id", user.id)
    .single<Pick<Profile, "plan" | "trial_ends_at" | "subscribed_at" | "subscription_status">>();
  const params = await searchParams;
  const payment = typeof params.paiement === "string" ? params.paiement : null;
  const plan = (profile?.plan ?? "basique") as Plan;
  const subscribed = ["active", "trialing", "past_due"].includes(profile?.subscription_status ?? "");
  const trialActive = profile ? !subscribed && hasActiveAccess(profile) : false;
  const daysLeft = profile ? trialDaysLeft(profile) : 0;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <span className={styles.overline}>
          <LockKeyhole aria-hidden="true" />
          Salon privé FLUX
        </span>
        <div className={styles.heroMark} aria-hidden="true">
          <Crown />
        </div>
        <h1>
          Choisis ton <span>rang</span>
        </h1>
        <p>
          Une formule fixe ton rythme de création : plus de crédits, plus de
          vitrines, plus d&apos;offres et plus de liberté pour construire une
          présence qui mérite l&apos;attention.
        </p>
        <div className={styles.heroFacts}>
          <span>
            <Sparkles aria-hidden="true" />
            {TRIAL_DAYS} jours offerts
          </span>
          <span>
            <Gem aria-hidden="true" />
            Crédits mensuels inclus
          </span>
          <span>
            <WalletCards aria-hidden="true" />
            Sans prélèvement surprise
          </span>
        </div>
        {trialActive && (
          <strong className={styles.trialStatus}>
            Ton essai est en cours : encore {daysLeft} jour
            {daysLeft > 1 ? "s" : ""}.
          </strong>
        )}
      </header>

      {payment === "annule" && (
        <div className={styles.checkoutNotice}>Paiement annulé — rien n&apos;a été débité.</div>
      )}
      {payment && payment !== "annule" && (
        <div className={styles.checkoutNotice}>Le paiement est momentanément indisponible. Réessaie ou contacte-nous.</div>
      )}

      <div className={styles.grid}>
        {FLUX_PLANS.map((item) => {
          const limits = PLAN_LIMITS[item];
          const isCurrent = subscribed && item === plan;
          const className = isCurrent
            ? styles.planActive
            : item === "business"
              ? styles.planFeatured
              : styles.plan;
          return (
            <article key={item} className={className}>
              <div className={styles.planTop}>
                <span>{PLAN_LABEL[item]}</span>
                {isCurrent ? (
                  <small>Formule actuelle</small>
                ) : item === "business" ? (
                  <small>Recommandée</small>
                ) : null}
              </div>
              <strong className={styles.price}>
                {limits.priceEur} €<small> /mois</small>
              </strong>
              <p className={styles.credits}>
                {limits.monthlyCredits} crédits chaque mois
              </p>
              <div className={styles.planDivider} />
              <ul className={styles.features}>
                <li>
                  <Check aria-hidden="true" /> {limits.projects} vitrine
                  {limits.projects > 1 ? "s" : ""}
                </li>
                <li>
                  <Check aria-hidden="true" /> {limits.offers} offres mises en avant
                </li>
                <li>
                  <Check aria-hidden="true" />{" "}
                  {limits.customDomain ? "Domaine personnalisé" : "Adresse FLUX incluse"}
                </li>
                {PLAN_FEATURES[item].map((feature) => (
                  <li key={feature}>
                    <Check aria-hidden="true" /> {feature}
                  </li>
                ))}
                <li>
                  <Check aria-hidden="true" /> Les crédits non utilisés
                  s&apos;additionnent
                </li>
              </ul>
              {isCurrent ? (
                <span className={styles.cta}>Ta formule</span>
              ) : (
                <Link className={`flux-button-smooth flux-button-smooth-gold ${styles.cta}`} href={`/checkout/formule/${item}`}>
                    Choisir {PLAN_LABEL[item]}
                    <ArrowRight aria-hidden="true" />
                </Link>
              )}
            </article>
          );
        })}
      </div>

      <div className={styles.note}>
        <span className={styles.noteIcon}>
          <WalletCards aria-hidden="true" />
        </span>
        <div>
          <p className={styles.noteKicker}>Crédits et liberté</p>
          <h2>Comment marchent les crédits ?</h2>
          <p>
            Chaque action qui mobilise nos serveurs consomme des crédits :
            publier une nouvelle version de ton site ({PUBLISH_COST} cr.),
            générer du contenu avec l&apos;IA, pré-remplir ta vitrine. Plus ta
            formule monte, plus tu peux modifier, publier et personnaliser. Le
            détail des coûts est sur <Link href="/credits">ta page crédits</Link>{" "}
            — rien n&apos;est prélevé sans confirmation.
          </p>
        </div>
      </div>
    </div>
  );
}
