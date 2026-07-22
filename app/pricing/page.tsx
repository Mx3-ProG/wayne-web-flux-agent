import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Coins, Gem, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { CREDIT_PACKS, packUnitPrice } from "@/lib/credit-packs";
import { FLUX_PLANS, PLAN_LIMITS, TRIAL_DAYS } from "@/lib/plans";
import { FluxBrand } from "@/components/flux-brand";
import { MarketingFooter } from "@/components/marketing-footer";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getRequestLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeHref } from "@/lib/i18n/config";
import { languageAlternates } from "@/lib/i18n/seo";
import { formatNumber } from "@/lib/i18n/format";
import { FluxPlanSelector } from "@/components/assistant/flux-plan-selector";
import styles from "./pricing.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale, "pricing");
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: languageAlternates(locale, "/pricing"),
  };
}

export default async function PricingPage() {
  const locale = await getRequestLocale();
  const [dict, common] = await Promise.all([
    getDictionary(locale, "pricing"),
    getDictionary(locale, "common"),
  ]);
  const href = (path: string) => localeHref(locale, path);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={href("/")} aria-label={common.brandHomeAria}><FluxBrand priority /></Link>
        <nav>
          <Link href={href("/")}>{common.nav.home}</Link>
          <Link href={href("/pricing")} aria-current="page">{common.nav.pricing}</Link>
          <Link href={href("/login")}>{common.nav.login}</Link>
        </nav>
        <LanguageSwitcher locale={locale} ariaLabel={common.languageSwitcher.aria} />
        <Link className={`flux-button-smooth ${styles.headerCta}`} href="/commencer">{dict.header.tryFree}</Link>
      </header>

      <main>
        <section className={styles.hero}>
          <p className={styles.eyebrow}><Sparkles aria-hidden="true" /> {dict.hero.eyebrow}</p>
          <h1>{dict.hero.titleLine1}<br /><em>{dict.hero.titleEm}</em></h1>
          <p>{dict.hero.text}</p>
          <div className={styles.heroFacts}>
            <span><Check /> {TRIAL_DAYS} {dict.hero.fact1}</span>
            <span><Check /> {dict.hero.fact2}</span>
            <span><Check /> {dict.hero.fact3}</span>
          </div>
        </section>

        <FluxPlanSelector />

        <section className={styles.section} aria-labelledby="plans-title">
          <div className={styles.sectionHeading}>
            <div><p>{dict.plans.kicker}</p><h2 id="plans-title">{dict.plans.title}</h2></div>
            <span>{dict.plans.note}</span>
          </div>
          <div className={styles.planGrid}>
            {FLUX_PLANS.map((plan) => {
              const limits = PLAN_LIMITS[plan];
              const featured = plan === "business";
              const planName = dict.planNames[plan];
              return (
                <article id={`plan-${plan}`} className={featured ? styles.planFeatured : styles.plan} key={plan}>
                  <div className={styles.planTop}>
                    <span>{planName}</span>
                    {featured && <small>{dict.plans.featured}</small>}
                  </div>
                  <p className={styles.price}><strong>{limits.priceEur} €</strong><span>{dict.plans.perMonth}</span></p>
                  <p className={styles.creditLine}><Coins aria-hidden="true" /> {limits.monthlyCredits} {dict.plans.creditsIncluded}</p>
                  <ul>
                    <li><Check /> {limits.projects} {limits.projects > 1 ? dict.plans.showcases : dict.plans.showcase}</li>
                    <li><Check /> {limits.offers} {dict.plans.activeOffers}</li>
                    <li><Check /> {limits.subpages} {dict.plans.subpages}</li>
                    {dict.features[plan].map((feature) => <li key={feature}><Check /> {feature}</li>)}
                  </ul>
                  <Link className={`flux-button-smooth ${styles.planCta}`} href={`/checkout/formule/${plan}`}>
                    {dict.plans.choose} {planName} <ArrowRight aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
          <p className={styles.checkoutNote}><ShieldCheck aria-hidden="true" /> {dict.plans.checkoutNote}</p>
        </section>

        <section className={`${styles.section} ${styles.creditsSection}`} aria-labelledby="credits-title">
          <div className={styles.sectionHeading}>
            <div><p>{dict.credits.kicker}</p><h2 id="credits-title">{dict.credits.title}</h2></div>
            <span>{dict.credits.note}</span>
          </div>
          <div className={styles.packGrid}>
            {CREDIT_PACKS.map((pack) => (
              <article className={pack.featured ? styles.packFeatured : styles.pack} key={pack.id}>
                <div className={styles.packIcon}>{pack.featured ? <Zap /> : <Gem />}</div>
                <div className={styles.packName}><p>{pack.label}</p>{pack.discountLabel && <small>{pack.discountLabel}</small>}</div>
                <strong>{pack.credits}<span> {dict.credits.creditsWord}</span></strong>
                <p>{formatNumber(locale, pack.priceCents / 100)} € <small>· {packUnitPrice(pack)} € {dict.credits.perCredit}</small></p>
                <Link className="flux-button-smooth" href={`/checkout/credits/${pack.id}`}>{dict.credits.buy} <ArrowRight /></Link>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.explainer}>
          <div><p>{dict.explainer.kicker}</p><h2>{dict.explainer.titleLine1}<br />{dict.explainer.titleLine2}</h2></div>
          <ol>
            <li><span>01</span><div><strong>{dict.explainer.step1Title}</strong><p>{dict.explainer.step1Text}</p></div></li>
            <li><span>02</span><div><strong>{dict.explainer.step2Title}</strong><p>{dict.explainer.step2Text}</p></div></li>
            <li><span>03</span><div><strong>{dict.explainer.step3Title}</strong><p>{dict.explainer.step3Text}</p></div></li>
          </ol>
        </section>
      </main>
      <MarketingFooter locale={locale} dict={common} />
    </div>
  );
}
