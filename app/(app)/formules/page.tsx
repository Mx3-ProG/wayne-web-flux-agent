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
import { Check } from "lucide-react";
import styles from "./formules.module.css";

export const metadata = { title: "Formules FLUX" };

// Fonctionnalités marketing par palier (en plus des limites chiffrées).
const PLAN_FEATURES: Record<Plan, string[]> = {
  basique: ["Personnalisation de base", "Outils IA inclus"],
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

// Pricing des formules FLUX — l'outil IA de Wayne-Web. Essai de 7 jours offert
// sur toutes les formules à l'inscription. Pas encore de paiement en ligne
// (Stripe viendra plus tard) : les CTA restent « bientôt disponible » et la
// souscription se pose manuellement côté admin.
export default async function FormulesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, trial_ends_at, subscribed_at")
    .eq("user_id", user.id)
    .single<Pick<Profile, "plan" | "trial_ends_at" | "subscribed_at">>();
  const plan = (profile?.plan ?? "basique") as Plan;
  const subscribed = Boolean(profile?.subscribed_at);
  const trialActive = profile ? !subscribed && hasActiveAccess(profile) : false;
  const daysLeft = profile ? trialDaysLeft(profile) : 0;

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>FLUX, l&apos;outil IA de Wayne-Web</p>
      <h1 className={styles.title}>Les formules FLUX</h1>
      <p className={styles.subtitle}>
        Tes crédits, c&apos;est ta liberté de création : plus de crédits, c&apos;est
        plus de fonctionnalités, plus de modifications, plus de
        personnalisation. {TRIAL_DAYS} jours d&apos;essai
        offerts sur toutes les formules.
        {trialActive && (
          <>
            {" "}
            <strong>
              Ton essai est en cours : encore {daysLeft} jour
              {daysLeft > 1 ? "s" : ""}.
            </strong>
          </>
        )}
      </p>

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
                <span className={styles.cta} title="Paiement en ligne bientôt disponible">
                  Bientôt disponible — essai {TRIAL_DAYS} j offert
                </span>
              )}
            </article>
          );
        })}
      </div>

      <div className={styles.note}>
        <strong>Comment marchent les crédits ?</strong> Chaque action qui
        mobilise nos serveurs consomme des crédits : publier une nouvelle
        version de ton site ({PUBLISH_COST} cr.), générer du contenu avec
        l&apos;IA, pré-remplir ta vitrine. Plus ta formule monte, plus tu peux
        modifier, publier et personnaliser. Le détail des coûts est sur{" "}
        <Link href="/credits">ta page crédits</Link> — rien n&apos;est prélevé
        sans confirmation.
      </div>
    </div>
  );
}
