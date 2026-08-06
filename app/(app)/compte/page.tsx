import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  hasActiveAccess,
  isActiveSubscriptionStatus,
  projectLimit,
  trialDaysLeft,
} from "@/lib/plans";
import type { Plan, Profile } from "@/lib/types";
import { logout } from "@/app/(app)/actions";
import { healMissingProfile } from "@/lib/profile-heal";
import { DeleteAccountForm, ProfileForm } from "@/components/account/profile-settings";
import { PasswordForm } from "@/components/account/password-form";
import { AssistantPreferencesCard } from "@/components/assistant/assistant-preferences-card";
import { EnablePushButton } from "@/components/notifications/enable-push-button";
import {
  EmailChangeForm,
  InviteFriendForm,
} from "@/components/account/email-invite-forms";
import {
  ArrowRight,
  Coins,
  FileText,
  Gift,
  Rocket,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import styles from "./compte.module.css";
import { AccountLanguageSettings } from "@/components/account/account-language-settings";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "account")).meta.title };
}

export default async function ComptePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    profileResult,
    topupResult,
    { count: projectCount },
    locale,
    assistantPreferenceResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).single<Profile>(),
    supabase.rpc("apply_plan_topup", { uid: user.id }),
    supabase
      .from("pages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    getAccountLocale(supabase, user.id),
    supabase
      .from("assistant_preferences")
      .select("enabled, paused_until, current_goal_id")
      .eq("user_id", user.id)
      .maybeSingle<{
        enabled: boolean;
        paused_until: string | null;
        current_goal_id: string | null;
      }>(),
  ]);
  const t = await getDictionary(locale, "account");
  let { data: profile, error: profileError } = profileResult;
  let balance = topupResult.data;

  // Profil manquant (ligne supprimée hors de l'app) : on le recrée à la volée
  // (lib/profile-heal.ts) puis on relit. Le layout fait pareil, mais layout et
  // page s'exécutent en parallèle — cette page ne peut pas compter sur lui.
  if (!profile) {
    await healMissingProfile(supabase, user);
    [{ data: profile, error: profileError }, { data: balance }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single<Profile>(),
      supabase.rpc("apply_plan_topup", { uid: user.id }),
    ]);
  }

  // NE PAS renvoyer un utilisateur CONNECTÉ vers /login : proxy.ts le renvoie
  // aussitôt sur /espace, si bien que le clic sur « Mon profil » ne faisait
  // rien du tout — deux redirections, aucun message, et la vraie erreur perdue.
  //
  // Ici, la réparation a déjà été tentée : on lève l'erreur (app/error.tsx)
  // après avoir journalisé la cause, au lieu de boucler en silence.
  if (profileError || !profile) {
    console.error("compte: profil illisible", {
      userId: user.id,
      code: profileError?.code,
      message: profileError?.message,
      details: profileError?.details,
    });
    throw new Error("Profil introuvable pour cet utilisateur.");
  }

  const plan = (profile.plan ?? "basique") as Plan;
  const subscribed = isActiveSubscriptionStatus(profile.subscription_status);
  const trialActive = !subscribed && hasActiveAccess(profile);
  const daysLeft = trialDaysLeft(profile);
  // Échéance Stripe réelle (un mois civil n'est pas toujours égal à 30 jours).
  const nextRecharge =
    subscribed && profile.current_period_end
      ? formatDate(locale, profile.current_period_end, { day: "numeric", month: "long" })
      : null;
  const canCreateProject = (projectCount ?? 0) < projectLimit(plan);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.avatar}><UserRound aria-hidden="true" /></span>
        <div>
          <p className={styles.eyebrow}>{t.hero.eyebrow}</p>
          <h1>{t.hero.title}</h1>
          <p>{t.hero.text}</p>
        </div>
      </header>

      <nav className={styles.anchorNav} aria-label={t.nav.aria}>
        <a href="#informations">{t.nav.info}</a>
        <a href="#aventure">{t.nav.adventure}</a>
        <a href="#inviter">{t.nav.invite}</a>
        <a href="#credits">{t.nav.credits}</a>
        <a href="#formules">{t.nav.plans}</a>
        <a href="#licence">{t.nav.license}</a>
        <Link href="/compte/facturation">{t.nav.billing}</Link>
      </nav>

      <section id="informations" className={styles.section}>
        <div className={styles.sectionHeading}>
          <h2>{t.info.title}</h2>
          <p>{t.info.text}</p>
        </div>
        <ProfileForm profile={profile} email={user.email ?? profile.email ?? ""} t={t} />
      </section>

      <AccountLanguageSettings />

      <section id="aventure" className={`${styles.section} ${styles.adventure}`}>
        <span className={styles.sectionIcon}><Rocket aria-hidden="true" /></span>
        <div>
          <p className={styles.eyebrow}>{t.nav.adventure}</p>
          <h2>{canCreateProject ? t.adventure.canCreateTitle : t.adventure.limitTitle}</h2>
          <p>{canCreateProject ? t.adventure.canCreateText : t.adventure.limitText}</p>
        </div>
        <Link href={canCreateProject ? "/projets/nouveau" : "/projets"} className={`flux-button-smooth ${styles.primaryAction}`}>
          {canCreateProject ? t.adventure.startTunnel : t.adventure.viewProjects}
          <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      <section id="inviter" className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.sectionIcon}><Gift aria-hidden="true" /></span>
          <h2>{t.invite.title}</h2>
          <p>{t.invite.text}</p>
        </div>
        <InviteFriendForm t={t} />
      </section>

      <section id="credits" className={styles.section}>
        <div className={styles.creditCard}>
          <span className={styles.sectionIcon}><Coins aria-hidden="true" /></span>
          <div>
            <p className={styles.eyebrow}>{t.credits.available}</p>
            <strong>{balance ?? 0}</strong>
            <small>
              {nextRecharge
                ? t.credits.nextRecharge.replace("{date}", nextRecharge)
                : trialActive
                  ? (daysLeft > 1 ? t.credits.trialPlural : t.credits.trial).replace("{days}", String(daysLeft))
                  : subscribed
                    ? t.credits.subscribed
                    : t.credits.trialOver}
            </small>
          </div>
          <Link href="/credits">{t.credits.viewUsage} <ArrowRight aria-hidden="true" /></Link>
        </div>
      </section>

      <section id="licence" className={styles.section}>
        <div className={styles.license}>
          <span className={styles.sectionIcon}><FileText aria-hidden="true" /></span>
          <div>
            <h2>{t.license.title}</h2>
            <p>{t.license.text}</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <AssistantPreferencesCard
          initialPreference={assistantPreferenceResult.data ? {
            enabled: assistantPreferenceResult.data.enabled,
            pausedUntil: assistantPreferenceResult.data.paused_until,
            currentGoalId: assistantPreferenceResult.data.current_goal_id,
          } : {
            enabled: true,
            pausedUntil: null,
            currentGoalId: null,
          }}
        />
      </section>

      {/* Notifications push : c'est le SEUL point d'entrée pour créer un
          abonnement (POST /api/push/subscribe). Sans cette section, la table
          push_subscriptions reste vide et le cron push-deliveries tourne à
          vide. Le composant ne rend rien si le navigateur ne supporte pas le
          Web Push ou si VAPID n'est pas configuré. */}
      <section className={styles.section}>
        <div className={styles.securityGrid}>
          <div>
            <h2>{t.notifications.title}</h2>
            <p>{t.notifications.text}</p>
          </div>
          <EnablePushButton t={t.notifications} />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.securityGrid}>
          <div>
            <h2>{t.security.title}</h2>
            <p>{t.security.text}</p>
          </div>
          <PasswordForm t={t} />
          <EmailChangeForm currentEmail={user.email ?? profile.email ?? ""} t={t} />
          <form action={logout}>
            <button type="submit" className={styles.secondaryAction}>{t.security.logout}</button>
          </form>
        </div>
      </section>

      <section className={`${styles.section} ${styles.danger}`}>
        <div className={styles.dangerHeading}>
          <ShieldAlert aria-hidden="true" />
          <div>
            <h2>{t.danger.title}</h2>
            <p>{t.danger.text}</p>
          </div>
        </div>
        <DeleteAccountForm t={t} />
      </section>
    </div>
  );
}
