import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  FLUX_PLANS,
  PLAN_LABEL,
  PLAN_LIMITS,
  hasActiveAccess,
  projectLimit,
  trialDaysLeft,
} from "@/lib/plans";
import type { CreditEntry, Plan, Profile } from "@/lib/types";
import { signOut } from "@/app/login/actions";
import { DeleteAccountForm, ProfileForm } from "@/components/account/profile-settings";
import { PasswordForm } from "@/components/account/password-form";
import {
  ArrowRight,
  Check,
  Coins,
  FileText,
  Rocket,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import styles from "./compte.module.css";

export const metadata = { title: "Mon profil" };

export default async function ComptePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: balance },
    { data: lastRecharge },
    { count: projectCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).single<Profile>(),
    supabase.rpc("apply_plan_topup", { uid: user.id }),
    supabase
      .from("credit_ledger")
      .select("created_at, reason")
      .eq("user_id", user.id)
      .like("reason", "topup:%")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Pick<CreditEntry, "created_at" | "reason">>(),
    supabase
      .from("pages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);
  if (!profile) redirect("/login");

  const plan = (profile.plan ?? "basique") as Plan;
  const subscribed = Boolean(profile.subscribed_at);
  const trialActive = !subscribed && hasActiveAccess(profile);
  const daysLeft = trialDaysLeft(profile);
  // Recharge : uniquement une fois souscrit, ancrée sur le dernier topup.
  const nextRecharge =
    subscribed && lastRecharge?.reason === `topup:${plan}`
      ? new Date(
          new Date(lastRecharge.created_at).getTime() + 30 * 86400_000
        ).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
      : null;
  const canCreateProject = (projectCount ?? 0) < projectLimit(plan);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.avatar}><UserRound aria-hidden="true" /></span>
        <div>
          <p className={styles.eyebrow}>Ton espace personnel</p>
          <h1>Mon profil</h1>
          <p>Tout ce qui concerne ton identité, ton activité et ton accès à FLUX.</p>
        </div>
      </header>

      <nav className={styles.anchorNav} aria-label="Sections du profil">
        <a href="#informations">Informations</a>
        <a href="#aventure">Commencer l’aventure</a>
        <a href="#credits">Crédits</a>
        <a href="#formules">Formules</a>
        <a href="#licence">Licence</a>
      </nav>

      <section id="informations" className={styles.section}>
        <div className={styles.sectionHeading}>
          <h2>Informations personnelles et professionnelles</h2>
          <p>Ces informations restent privées et servent à personnaliser ton expérience.</p>
        </div>
        <ProfileForm profile={profile} email={user.email ?? profile.email ?? ""} />
      </section>

      <section id="aventure" className={`${styles.section} ${styles.adventure}`}>
        <span className={styles.sectionIcon}><Rocket aria-hidden="true" /></span>
        <div>
          <p className={styles.eyebrow}>Commencer l’aventure</p>
          <h2>{canCreateProject ? "Crée une nouvelle vitrine" : "Retrouve tes projets"}</h2>
          <p>
            {canCreateProject
              ? "Quelques questions suffisent : FLUX prépare la base et tu gardes la main sur tout."
              : "Ton forfait a atteint sa limite de projets. Tu peux gérer tes vitrines existantes."}
          </p>
        </div>
        <Link href={canCreateProject ? "/projets/nouveau" : "/projets"} className={styles.primaryAction}>
          {canCreateProject ? "Lancer le tunnel" : "Voir mes projets"}
          <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      <section id="credits" className={styles.section}>
        <div className={styles.creditCard}>
          <span className={styles.sectionIcon}><Coins aria-hidden="true" /></span>
          <div>
            <p className={styles.eyebrow}>Crédits disponibles</p>
            <strong>{balance ?? 0}</strong>
            <small>
              {nextRecharge
                ? `Prochaine recharge le ${nextRecharge}`
                : trialActive
                  ? `Essai FLUX : ${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}`
                  : subscribed
                    ? "Recharge via ta formule FLUX"
                    : "Essai terminé — choisis ta formule FLUX"}
            </small>
          </div>
          <Link href="/credits">Voir mon utilisation <ArrowRight aria-hidden="true" /></Link>
        </div>
      </section>

      <section id="formules" className={styles.section}>
        <div className={styles.sectionHeading}>
          <h2>Formules FLUX</h2>
          <p>Plus de crédits, plus de possibilités : fonctionnalités, modifications, personnalisation. 7 jours d’essai offerts. <Link href="/formules">Voir le détail des formules</Link></p>
        </div>
        <div className={styles.plans}>
          {FLUX_PLANS.map((item) => (
            <article className={subscribed && item === plan ? styles.planActive : styles.plan} key={item}>
              <div className={styles.planTop}>
                <span>{PLAN_LABEL[item]}</span>
                {subscribed && item === plan && <small>Formule actuelle</small>}
              </div>
              <strong>{`${PLAN_LIMITS[item].priceEur} €/mois`}</strong>
              <ul>
                <li><Check aria-hidden="true" /> {PLAN_LIMITS[item].monthlyCredits} crédits/mois</li>
                <li><Check aria-hidden="true" /> {PLAN_LIMITS[item].projects} projet{PLAN_LIMITS[item].projects > 1 ? "s" : ""}</li>
                <li><Check aria-hidden="true" /> {PLAN_LIMITS[item].offers} offres actives</li>
                <li><Check aria-hidden="true" /> {PLAN_LIMITS[item].customDomain ? "Domaine personnalisé" : "Adresse FLUX incluse"}</li>
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section id="licence" className={styles.section}>
        <div className={styles.license}>
          <span className={styles.sectionIcon}><FileText aria-hidden="true" /></span>
          <div>
            <h2>Licence d’utilisation</h2>
            <p>
              Tu restes propriétaire des informations et contenus que tu ajoutes.
              FLUX te fournit un droit personnel d’utilisation du service, sans
              transfert de propriété sur la plateforme.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.securityGrid}>
          <div>
            <h2>Sécurité</h2>
            <p>Modifie ton mot de passe ou ferme ta session sur cet appareil.</p>
          </div>
          <PasswordForm />
          <form action={signOut}>
            <button type="submit" className={styles.secondaryAction}>Se déconnecter</button>
          </form>
        </div>
      </section>

      <section className={`${styles.section} ${styles.danger}`}>
        <div className={styles.dangerHeading}>
          <ShieldAlert aria-hidden="true" />
          <div>
            <h2>Zone de danger</h2>
            <p>
              La suppression efface définitivement ton compte, tes vitrines,
              clients, commandes, rendez-vous et contenus. Cette action est irréversible.
            </p>
          </div>
        </div>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
