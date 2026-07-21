import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LABEL, PLAN_LIMITS } from "@/lib/plans";
import type { Plan, Profile } from "@/lib/types";
import { openBillingPortal } from "./actions";
import styles from "./facturation.module.css";
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
  return { title: (await getDictionary(locale, "account")).meta.billingTitle };
}

export default async function BillingPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, locale] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, stripe_customer_id, subscription_status, current_period_end, cancel_at_period_end")
      .eq("user_id", user.id)
      .single<Pick<Profile, "plan" | "stripe_customer_id" | "subscription_status" | "current_period_end" | "cancel_at_period_end">>(),
    getAccountLocale(supabase, user.id),
  ]);
  const t = (await getDictionary(locale, "account")).billing;
  const params = await searchParams;
  const plan = (profile?.plan ?? "basique") as Plan;
  const status = profile?.subscription_status ?? null;
  const periodEnd = profile?.current_period_end
    ? formatDate(locale, profile.current_period_end, { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className={styles.page}>
      <header><p>{t.kicker}</p><h1>{t.title}</h1><span>{t.subtitle}</span></header>
      {params.erreur && <div className={styles.notice}>{t.portalUnavailable}</div>}
      <section className={styles.card}>
        <div><small>{t.currentPlan}</small><h2>{status ? PLAN_LABEL[plan] : t.noActivePlan}</h2></div>
        {status && <span className={status === "past_due" ? styles.warning : styles.status}>{t.status[status as keyof typeof t.status] ?? status}</span>}
        {status && (
          <dl>
            <div><dt>{t.price}</dt><dd>{t.priceValue.replace("{price}", String(PLAN_LIMITS[plan].priceEur))}</dd></div>
            <div><dt>{t.includedCredits}</dt><dd>{t.includedCreditsValue.replace("{credits}", String(PLAN_LIMITS[plan].monthlyCredits))}</dd></div>
            <div><dt>{profile?.cancel_at_period_end ? t.accessEndsAt : t.nextDueDate}</dt><dd>{periodEnd ?? t.toConfirm}</dd></div>
          </dl>
        )}
        {profile?.stripe_customer_id ? (
          <form action={openBillingPortal}><button className="flux-button-smooth" type="submit">{t.manage}</button></form>
        ) : (
          <Link className={`flux-button-smooth ${styles.button}`} href="/formules">{t.choosePlan}</Link>
        )}
        <p className={styles.help}>{t.help}</p>
      </section>
      <Link className={styles.back} href="/compte">{t.back}</Link>
    </div>
  );
}
