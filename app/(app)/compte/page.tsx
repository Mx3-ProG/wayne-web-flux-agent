import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { 
  PLAN_LABEL,
  PLAN_LIMITS,
  hasActiveAccess,
  isActiveSubscriptionStatus,
  projectLimit,
  trialDaysLeft,
} from "@/lib/plans";
import type { Plan, Profile } from "@/lib/types";
import { logout } from "@/app/(app)/actions";
import { DeleteAccountForm, ProfileForm } from "@/components/account/profile-settings";
import { PasswordForm } from "@/components/account/password-form";
import {
  EmailChangeForm,
  InviteFriendForm,
} from "@/components/account/email-invite-forms";
import {
  ArrowRight,
  Check,
  Coins,
  FileText,
  Gift,
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

  const [{ data: profile }, { data: balance }, { count: projectCount }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).single<Profile>(),
    supabase.rpc("apply_plan_topup", { uid: user.id }),
    supabase
      .from("pages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);
  if (!profile) redirect("/login");

  const plan = (profile.plan ?? "basique") as Plan;
  const subscribed = isActiveSubscriptionStatus(profile.subscription_status);
  const trialActive = !subscribed && hasActiveAccess(profile);
  const daysLeft = trialDaysLeft(profile);
  // Échéance Stripe réelle (un mois civil n'est pas toujours égal à 30 jours).
  const nextRecharge =
    subscribed && profile.current_period_end
      ? new Date(profile.current_period_end).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
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
        <a href="#inviter">Inviter un ami</a>
        <a href="#credits">Crédits</a>
        <a href="#formules">Formules</a>
        <a href="#licence">Licence</a>
        <Link href="/compte/facturation">Facturation</Link>
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
        <Link href={canCreateProject ? "/projets/nouveau" : "/projets"} className={`flux-button-smooth ${styles.primaryAction}`}>
          {canCreateProject ? "Lancer le tunnel" : "Voir mes projets"}
          <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      <section id="inviter" className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.sectionIcon}><Gift aria-hidden="true" /></span>
          <h2>Inviter un ami</h2>
          <p>Fais découvrir FLUX à un commerçant que tu connais : il reçoit une invitation et 7 jours d’essai offerts.</p>
        </div>
        <InviteFriendForm />
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
            <p>Gère tes identifiants grâce à des validations sécurisées par email, ou ferme ta session sur cet appareil.</p>
          </div>
          <PasswordForm />
          <EmailChangeForm currentEmail={user.email ?? profile.email ?? ""} />
          <form action={logout}>
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
