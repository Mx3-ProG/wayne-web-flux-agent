import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { defaultLocale } from "@/lib/i18n/config";
import { TOOLS, PREFILL_COST } from "@/lib/tools-config";
import {
  CATEGORY_CREATE_COST,
  CONTEXT_CHANGE_COST,
  OFFER_CREATE_COST,
  PRODUCT_ADD_COST,
  RESERVATION_ADD_COST,
  OFFER_EXTRA_COST,
  PLAN_LABEL,
  PLAN_LIMITS,
  PRODUCT_CREATE_COST,
  PUBLISH_COST,
  TRIAL_DAYS,
  VITRINE_ASSIST_COST,
  hasActiveAccess,
  isActiveSubscriptionStatus,
  trialDaysLeft,
} from "@/lib/plans";
import { getPack } from "@/lib/credit-packs";
import type { CreditEntry, Plan, Profile } from "@/lib/types";
import {
  Coins,
  Gem,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { CreditPacks } from "./credit-packs";
import styles from "./credits.module.css";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary, type BillingDict } from "@/lib/i18n/get-dictionary";
import { formatDate } from "@/lib/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "billing")).meta.creditsTitle };
}

const CREDIT_LEVELS = [100, 250, 500, 1000, 1500, 3000, 5000, 10000] as const;

function reasonLabel(t: BillingDict["credits"]["reasons"], reason: string): string {
  const staticMap: Record<string, string> = {
    signup: t.signup,
    monthly: t.monthly,
    prefill: t.prefill,
    "offer:create": t.offerCreate,
    "offer:extra": t.offerExtra,
    "product:create": t.productCreate,
    "category:create": t.categoryCreate,
    "product:add": t.productAdd,
    "reservation:add": t.reservationAdd,
    "vitrine:guide": t.vitrineGuide,
    "voice:update": t.voiceUpdate,
  };
  if (staticMap[reason]) return staticMap[reason];
  if (reason.startsWith("tool:")) {
    const tool = TOOLS.find((tl) => tl.slug === reason.slice(5));
    return tool?.name ?? reason.slice(5);
  }
  if (reason.startsWith("purchase:")) {
    const pack = getPack(reason.slice(9));
    return pack
      ? t.purchasePack.replace("{label}", pack.label).replace("{credits}", String(pack.credits))
      : t.purchase;
  }
  if (reason.startsWith("refund:")) return t.refund;
  if (reason.startsWith("topup:")) {
    const plan = reason.slice(6) as Plan;
    return t.topup.replace("{plan}", PLAN_LABEL[plan] ?? plan);
  }
  if (reason.startsWith("invoice:")) {
    const plan = reason.split(":topup:")[1] as Plan | undefined;
    return plan ? t.topup.replace("{plan}", PLAN_LABEL[plan] ?? plan) : t.monthlyTopup;
  }
  if (reason.startsWith("publish:")) {
    const version = reason.split(":v")[1];
    return version ? t.publishVersion.replace("{version}", version) : t.publishGeneric;
  }
  return reason;
}

function creditRank(balance: number) {
  const safeBalance = Math.max(0, balance);
  const levelIndex = CREDIT_LEVELS.findIndex((target) => safeBalance <= target);
  const index = levelIndex === -1 ? CREDIT_LEVELS.length - 1 : levelIndex;
  const previous = index === 0 ? 0 : CREDIT_LEVELS[index - 1];
  const target = CREDIT_LEVELS[index];
  const progress = Math.min(
    100,
    Math.max(0, ((safeBalance - previous) / (target - previous)) * 100)
  );

  return {
    level: index + 1,
    target,
    progress,
  };
}

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const achat = typeof params.achat === "string" ? params.achat : null;

  const [{ data: balance }, { data: ledger }, { data: profile }, locale] =
    await Promise.all([
      supabase.rpc("apply_plan_topup", { uid: user.id }),
      supabase
        .from("credit_ledger")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("profiles")
        .select("plan, trial_ends_at, subscribed_at, subscription_status, current_period_end")
        .eq("user_id", user.id)
        .single<Pick<Profile, "plan" | "trial_ends_at" | "subscribed_at" | "subscription_status" | "current_period_end">>(),
      getAccountLocale(supabase, user.id),
    ]);
  const t = (await getDictionary(locale, "billing")).credits;

  const plan = (profile?.plan ?? "basique") as Plan;
  const monthlyCredits = PLAN_LIMITS[plan].monthlyCredits;
  const entries = (ledger ?? []) as CreditEntry[];
  const subscribed = isActiveSubscriptionStatus(profile?.subscription_status);
  const trialActive = profile ? !subscribed && hasActiveAccess(profile) : false;
  const daysLeft = profile ? trialDaysLeft(profile) : 0;
  const currentBalance = balance ?? 0;
  const rank = creditRank(currentBalance);
  const progressStyle = {
    "--credit-progress": `${rank.progress}%`,
  } as CSSProperties;

  // Prochaine recharge : uniquement une fois souscrit, ancrée sur le dernier
  // topup de la formule courante.
  const nextRecharge =
    subscribed && profile?.current_period_end
      ? formatDate(locale, profile.current_period_end, { day: "numeric", month: "long" })
      : null;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <span className={styles.overline}>
          <LockKeyhole aria-hidden="true" />
          {t.eyebrow}
        </span>
        <div className={styles.heroMark} aria-hidden="true">
          <WalletCards />
        </div>
        <h1>
          {t.titleStart} <span>{t.titleEm}</span>
        </h1>
        <p>{t.text}</p>
        <div className={styles.heroTrust}>
          <Gem aria-hidden="true" />
          <strong>{t.trustRate}</strong>
          <span>{t.trustHint}</span>
        </div>
      </header>

      {achat === "succes" && (
        <div className={styles.success}>
          <strong>{t.paymentSuccessTitle}</strong> {t.paymentSuccessText}
        </div>
      )}
      {achat === "annule" && (
        <div className={styles.notice}>{t.paymentCancelled}</div>
      )}

      <section className={styles.balanceVault}>
        <div className={styles.balanceHead}>
          <div>
            <p className={styles.goldLabel}>{t.balanceAvailable}</p>
            <strong className={styles.balance}>
              {currentBalance}
              <span> {t.creditsUnit}</span>
            </strong>
          </div>
          <div className={styles.trialPill}>
            {nextRecharge ? (
              <>{t.nextRecharge.replace("{date}", nextRecharge)}</>
            ) : trialActive ? (
              <>{(daysLeft > 1 ? t.trialPlural : t.trial).replace("{days}", String(daysLeft))}</>
            ) : (
              <>{subscribed ? t.planLabel.replace("{plan}", PLAN_LABEL[plan]) : t.trialOver}</>
            )}
          </div>
        </div>

        <div className={styles.levelPanel}>
          <div className={styles.levelTop}>
            <span>{t.level.replace("{level}", String(rank.level))}</span>
            <strong>{currentBalance} / {rank.target} cr.</strong>
          </div>
          <div className={styles.progressTrack} style={progressStyle}>
            <span />
          </div>
          <ol className={styles.levels} aria-label={t.levelsAria}>
            {CREDIT_LEVELS.map((level, index) => (
              <li
                key={level}
                data-current={rank.level === index + 1 ? "true" : undefined}
                data-reached={currentBalance >= level ? "true" : undefined}
              >
                <span>{index + 1}</span>
                <small>{level} cr.</small>
              </li>
            ))}
          </ol>
        </div>

        {!subscribed && (
          <p className={styles.formulaHint}>
            {trialActive ? `${t.continueAfterTrial} ` : `${t.rechargeToReactivate} `}
            <Link href="/formules">{t.discoverPlans}</Link>.
          </p>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span>
            <Coins aria-hidden="true" />
            {t.rechargeSection.kicker}
          </span>
          <div>
            <p className={styles.goldLabel}>{t.rechargeSection.eyebrow}</p>
            <h2>{t.rechargeSection.title}</h2>
            <p>{t.rechargeSection.text}</p>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <CreditPacks t={t.packs} locale={locale} />
          {profile && !hasActiveAccess(profile) && (
            <p className={styles.smallNote}>
              {t.rechargeSection.trialOverNote}{" "}
              <Link href="/formules">{t.rechargeSection.choosePlan}</Link>.
            </p>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span>
            <ShieldCheck aria-hidden="true" />
            {t.trustSection.kicker}
          </span>
          <div>
            <p className={styles.goldLabel}>{t.trustSection.eyebrow}</p>
            <h2>{t.trustSection.title}</h2>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <ul className={styles.ruleList}>
            <li>
              <strong>{t.trustSection.freeCredits}</strong>{" "}
              {t.trustSection.freeCreditsText.replace("{days}", String(TRIAL_DAYS))}
            </li>
            <li>
              <strong>{t.trustSection.rate}</strong> {t.trustSection.rateText}
            </li>
            <li>
              {t.trustSection.costShown}{" "}
              <strong>{t.trustSection.costShownBold}</strong> {t.trustSection.costShownText}
            </li>
            <li>{t.trustSection.neverLost}</li>
            <li>
              {subscribed ? (
                <>
                  {t.trustSection.subscribedRecharge.replace("{plan}", PLAN_LABEL[plan])}{" "}
                  <strong>
                    {t.trustSection.subscribedRechargeBold.replace("{credits}", String(monthlyCredits))}
                  </strong>
                  .
                </>
              ) : (
                <>
                  {t.trustSection.unsubscribedRecharge}{" "}
                  <Link href="/formules">{t.trustSection.unsubscribedRechargeLink}</Link>{" "}
                  {t.trustSection.unsubscribedRechargeText}
                </>
              )}
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span>
            <Landmark aria-hidden="true" />
            {t.pricingSection.kicker}
          </span>
          <div>
            <p className={styles.goldLabel}>{t.pricingSection.eyebrow}</p>
            <h2>{t.pricingSection.title}</h2>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <ul className={styles.costList}>
            <li>
              <span>{t.pricingSection.publish}</span>
              <strong>{PUBLISH_COST} cr.</strong>
            </li>
            <li>
              <span>{t.pricingSection.offerCreate}</span>
              <strong>
                {t.pricingSection.offerCreateValue
                  .replace("{cost}", String(OFFER_CREATE_COST))
                  .replace("{extra}", String(OFFER_EXTRA_COST))}
              </strong>
            </li>
            <li>
              <span>{t.pricingSection.productCreate}</span>
              <strong>{PRODUCT_CREATE_COST} cr.</strong>
            </li>
            <li>
              <span>{t.pricingSection.categoryCreate}</span>
              <strong>{CATEGORY_CREATE_COST} cr.</strong>
            </li>
            <li>
              <span>{t.pricingSection.productAdd}</span>
              <strong>{PRODUCT_ADD_COST} cr.</strong>
            </li>
            <li>
              <span>{t.pricingSection.reservationAdd}</span>
              <strong>{RESERVATION_ADD_COST} cr.</strong>
            </li>
            <li>
              <span>{t.pricingSection.vitrineAssist}</span>
              <strong>{VITRINE_ASSIST_COST} cr.</strong>
            </li>
            <li>
              <span>{t.pricingSection.contextChange}</span>
              <strong>{CONTEXT_CHANGE_COST} cr.</strong>
            </li>
            {TOOLS.map((tool) => (
              <li key={tool.slug}>
                <span>{tool.name}</span>
                <strong>{tool.cost} cr.</strong>
              </li>
            ))}
            <li>
              <span>{t.pricingSection.prefill}</span>
              <strong>{PREFILL_COST} cr.</strong>
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span>
            <Sparkles aria-hidden="true" />
            {t.historySection.kicker}
          </span>
          <div>
            <p className={styles.goldLabel}>{t.historySection.eyebrow}</p>
            <h2>{t.historySection.title}</h2>
          </div>
        </div>
        <div className={styles.sectionBody}>
          {entries.length === 0 ? (
            <p className={styles.emptyHistory}>{t.historySection.empty}</p>
          ) : (
            <ul className={styles.historyList}>
              {entries
                .filter((e) => e.delta !== 0)
                .map((e) => (
                  <li key={e.id}>
                    <span>
                      {formatDate(locale, e.created_at, {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                    <strong>{reasonLabel(t.reasons, e.reason)}</strong>
                    <span
                      className={e.delta > 0 ? styles.positive : styles.negative}
                    >
                      {e.delta > 0 ? `+${e.delta}` : e.delta}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
