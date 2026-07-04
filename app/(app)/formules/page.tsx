import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FLUX_PLANS, PLAN_LABEL, PLAN_LIMITS, PUBLISH_COST } from "@/lib/plans";
import type { Plan, Profile } from "@/lib/types";
import { Check } from "lucide-react";
import styles from "./formules.module.css";

export const metadata = { title: "Formules FLUX" };

// Pricing des formules FLUX — l'outil IA de Wayne-Web. Pas encore de paiement
// en ligne (Stripe viendra plus tard) : les CTA restent « bientôt disponible »
// et la bascule de plan se fait manuellement côté admin.
export default async function FormulesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("user_id", user.id)
    .single<Pick<Profile, "plan">>();
  const plan = (profile?.plan ?? "free") as Plan;

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>FLUX, l&apos;outil IA de Wayne-Web</p>
      <h1 className={styles.title}>Les formules FLUX</h1>
      <p className={styles.subtitle}>
        Tes crédits font vivre ton site : publications, contenus IA,
        pré-remplissages. 1 crédit ≈ 1 €. Choisis la formule qui suit ton
        rythme.
      </p>

      <div className={styles.grid}>
        {FLUX_PLANS.map((item) => {
          const limits = PLAN_LIMITS[item];
          const isCurrent = item === plan;
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
                {limits.priceEur === 0 ? "0 €" : (
                  <>
                    {limits.priceEur} €<small> /mois</small>
                  </>
                )}
              </strong>
              <p className={styles.credits}>
                {limits.monthlyCredits > 0
                  ? `${limits.monthlyCredits} crédits chaque mois`
                  : "100 crédits offerts à l'inscription"}
              </p>
              <ul className={styles.features}>
                <li>
                  <Check aria-hidden="true" /> {limits.projects} vitrine
                  {limits.projects > 1 ? "s" : ""} ({limits.projects > 1 ? "multi-projets" : "un projet"})
                </li>
                <li>
                  <Check aria-hidden="true" /> {limits.offers} offres mises en avant
                </li>
                <li>
                  <Check aria-hidden="true" />{" "}
                  {limits.customDomain ? "Domaine personnalisé" : "Adresse FLUX incluse"}
                </li>
                <li>
                  <Check aria-hidden="true" /> Outils IA et publications, au
                  même tarif en crédits
                </li>
                {limits.monthlyCredits > 0 && (
                  <li>
                    <Check aria-hidden="true" /> Les crédits non utilisés
                    s&apos;additionnent
                  </li>
                )}
              </ul>
              {isCurrent ? (
                <span className={styles.cta}>Ta formule</span>
              ) : limits.priceEur === 0 ? (
                <span className={styles.cta}>Incluse à l&apos;inscription</span>
              ) : (
                <span className={styles.cta} title="Paiement en ligne bientôt disponible">
                  Bientôt disponible
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
        l&apos;IA, pré-remplir ta vitrine. Le détail des coûts est sur{" "}
        <Link href="/credits">ta page crédits</Link> — rien n&apos;est prélevé
        sans confirmation.
      </div>
    </div>
  );
}
