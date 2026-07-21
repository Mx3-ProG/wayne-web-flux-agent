import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  FLUX_PLANS,
  PLAN_LABEL,
  PLAN_LIMITS,
  PUBLISH_COST,
  TRIAL_DAYS,
  hasActiveAccess,
  isActiveSubscriptionStatus,
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
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "billing")).meta.plansTitle };
}

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

  const [{ data: profile }, locale] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, trial_ends_at, subscribed_at, subscription_status")
      .eq("user_id", user.id)
      .single<Pick<Profile, "plan" | "trial_ends_at" | "subscribed_at" | "subscription_status">>(),
    getAccountLocale(supabase, user.id),
  ]);
  const t = (await getDictionary(locale, "billing")).plans;
  // Fonctionnalités marketing par palier (en plus des limites chiffrées),
  // traduites : la structure vit dans billing.json (plans.features).
  const PLAN_FEATURES = t.features as Record<Plan, string[]>;
  const params = await searchParams;
  const payment = typeof params.paiement === "string" ? params.paiement : null;
  const plan = (profile?.plan ?? "basique") as Plan;
  const subscribed = isActiveSubscriptionStatus(profile?.subscription_status);
  const trialActive = profile ? !subscribed && hasActiveAccess(profile) : false;
  const daysLeft = profile ? trialDaysLeft(profile) : 0;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <span className={styles.overline}>
          <LockKeyhole aria-hidden="true" />
          {t.eyebrow}
        </span>
        <div className={styles.heroMark} aria-hidden="true">
          <Crown />
        </div>
        <h1>
          {t.titleStart} <span>{t.titleEm}</span>
        </h1>
        <p>{t.text}</p>
        <div className={styles.heroFacts}>
          <span>
            <Sparkles aria-hidden="true" />
            {t.trialDays.replace("{days}", String(TRIAL_DAYS))}
          </span>
          <span>
            <Gem aria-hidden="true" />
            {t.monthlyCredits}
          </span>
          <span>
            <WalletCards aria-hidden="true" />
            {t.noSurprise}
          </span>
        </div>
        {trialActive && (
          <strong className={styles.trialStatus}>
            {(daysLeft > 1 ? t.trialActivePlural : t.trialActive).replace("{days}", String(daysLeft))}
          </strong>
        )}
      </header>

      {payment === "annule" && (
        <div className={styles.checkoutNotice}>{t.paymentCancelled}</div>
      )}
      {payment && payment !== "annule" && (
        <div className={styles.checkoutNotice}>{t.paymentUnavailable}</div>
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
                  <small>{t.currentPlan}</small>
                ) : item === "business" ? (
                  <small>{t.recommended}</small>
                ) : null}
              </div>
              <strong className={styles.price}>
                {limits.priceEur} €<small> {t.perMonth}</small>
              </strong>
              <p className={styles.credits}>
                {t.creditsPerMonth.replace("{credits}", String(limits.monthlyCredits))}
              </p>
              <div className={styles.planDivider} />
              <ul className={styles.features}>
                <li>
                  <Check aria-hidden="true" /> {limits.projects}{" "}
                  {limits.projects > 1 ? t.storefrontPlural : t.storefrontSingular}
                </li>
                <li>
                  <Check aria-hidden="true" /> {limits.offers} {t.offersHighlighted}
                </li>
                <li>
                  <Check aria-hidden="true" />{" "}
                  {limits.customDomain ? t.customDomain : t.fluxAddress}
                </li>
                {PLAN_FEATURES[item].map((feature) => (
                  <li key={feature}>
                    <Check aria-hidden="true" /> {feature}
                  </li>
                ))}
                <li>
                  <Check aria-hidden="true" /> {t.creditsAccumulate}
                </li>
              </ul>
              {isCurrent ? (
                <span className={styles.cta}>{t.yourPlan}</span>
              ) : (
                <Link className={`flux-button-smooth flux-button-smooth-gold ${styles.cta}`} href={`/checkout/formule/${item}`}>
                    {t.choose.replace("{plan}", PLAN_LABEL[item])}
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
          <p className={styles.noteKicker}>{t.note.kicker}</p>
          <h2>{t.note.title}</h2>
          <p>
            {t.note.text.replace("{cost}", String(PUBLISH_COST))}{" "}
            <Link href="/credits">{t.note.link}</Link> {t.note.textEnd}
          </p>
        </div>
      </div>
    </div>
  );
}
