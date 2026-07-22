import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TOOLS } from "@/lib/tools-config";
import { loadJourneySignals } from "@/lib/journey-signals";
import { journeyState, type JourneyStepId } from "@/lib/journey";
import { CopyButton } from "@/components/copy-button";
import { RevenueCounter } from "@/components/revenue-counter";
import { completeJourneyStep } from "./actions";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale } from "@/lib/i18n/config";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
  Globe2,
  Pencil,
  Sparkles,
  Store,
} from "lucide-react";
import styles from "./espace.module.css";
import { FluxContextCard } from "@/components/assistant/flux-context-card";
import { JOURNEY_GUIDANCE_BY_STEP } from "@/lib/assistant/guidance";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "workspace")).meta.title };
}

export default async function EspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, journey, locale] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).single(),
    loadJourneySignals(supabase, user.id),
    getAccountLocale(supabase, user.id),
  ]);
  const [t, journeyDict] = await Promise.all([
    getDictionary(locale, "workspace"),
    getDictionary(locale, "journey"),
  ]);
  const { page, generations, balance, revenueCents, signals } = journey;
  const { steps, completedCount, total, nextStep } = journeyState(signals);
  const stepTitle = (n: JourneyStepId) => journeyDict.steps[String(n) as keyof typeof journeyDict.steps].title;

  // Un compte qui n'a encore rien franchi n'a rien à faire sur le dashboard :
  // le tunnel est le seul endroit qui le mène jusqu'à un espace rempli.
  if (completedCount === 0 && (profile?.onboarding_step ?? 0) < 99) {
    redirect("/commencer");
  }

  const completion = signals.voiceCompletion;
  const upcomingCount = signals.upcomingBookings;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.flux-wayne.com";
  const pageUrl = page ? `${siteUrl}/p/${page.slug}#prestations` : null;

  // Le « quoi faire » de chaque étape. La liste et l'ordre viennent de
  // lib/journey.ts (partagé avec le tunnel) ; seul le rendu vit ici.
  const stepContent: Record<JourneyStepId, React.ReactNode> = {
    1: (
      <Link className={styles.journeyAction} href="/ma-page">
        <span>{page ? t.steps.openEditor : t.steps.createStorefront}</span>
        <ArrowRight aria-hidden="true" />
      </Link>
    ),
    2: (
      <div className={styles.voiceBlock}>
        <p className={styles.voiceScore}>
          {t.steps.voiceScore.replace("{percent}", String(completion))}
        </p>
        <div className={styles.voiceMeter}>
          <div style={{ width: `${completion}%` }} />
        </div>
        <p className={styles.stepHint}>{t.steps.voiceHint}</p>
        <Link className={styles.journeyAction} href="/contexte">
          <span>
            {completion >= 70 ? t.steps.voiceRefine : t.steps.voiceMeet}
          </span>
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    ),
    3: (
      <Link className={styles.journeyAction} href="/produits/configurer">
        <span>{signals.productCount > 0 ? t.steps.createMoreProducts : t.steps.startProductCreation}</span>
        <ArrowRight aria-hidden="true" />
      </Link>
    ),
    4: (
      <Link className={styles.journeyAction} href="/offres/configurer">
        <span>{signals.offerCount > 0 ? t.steps.createNewOffer : t.steps.startOfferCreation}</span>
        <ArrowRight aria-hidden="true" />
      </Link>
    ),
    5: (
      <Link className={styles.journeyAction} href="/agenda">
        <span>{signals.openScheduleCount > 0 ? t.steps.reviewSchedule : t.steps.configureSchedule}</span>
        <ArrowRight aria-hidden="true" />
      </Link>
    ),
    6: (
      <div className={styles.toolsBlock} id="outils">
        <p className={styles.stepHint}>{t.steps.toolsHint}</p>
        <div className={styles.toolGrid}>
          {TOOLS.map((tool) => (
            <Link
              key={tool.slug}
              href={`/outil/${tool.slug}`}
              className={styles.toolCard}
            >
              {tool.badge && (
                <span className={styles.toolBadge}>{tool.badge}</span>
              )}
              <span className={styles.toolName}>{tool.name}</span>
              <span className={styles.toolTagline}>{tool.tagline}</span>
              <span className={styles.toolCost}>{tool.cost} cr.</span>
            </Link>
          ))}
        </div>
      </div>
    ),
    7: (
      <div className={styles.resultGrid}>
        <div className={styles.resultCard}>
          <strong>{balance}</strong>
          <span>{t.steps.creditsLeft}</span>
          <Link href="/credits">{t.steps.viewCredits}</Link>
        </div>
        <div className={styles.resultCard}>
          <strong>{generations.length}</strong>
          <span>
            {generations.length > 1 ? t.steps.creationPlural : t.steps.creationSingular} {t.steps.inYourVault}
          </span>
          <Link href="/resultats">{t.steps.openVault}</Link>
        </div>
        <div className={styles.resultCard}>
          <strong>{upcomingCount}</strong>
          <span>{t.steps.upcomingAppointments}</span>
          <Link href="/agenda">{t.steps.openAgenda}</Link>
        </div>
      </div>
    ),
    8: (
      <div className={styles.shareBlock}>
        <p className={styles.stepHint}>{t.steps.shareHint}</p>
        {pageUrl && (
          <div className={styles.shareRow}>
            <CopyButton text={pageUrl} />
            <a
              className={styles.journeyAction}
              href={`https://wa.me/?text=${encodeURIComponent(t.steps.whatsappMessage.replace("{url}", pageUrl))}`}
              target="_blank"
              rel="noreferrer"
            >
              <span>{t.steps.shareWhatsapp}</span>
              <ArrowRight aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    ),
  };

  return (
    <div className={styles.page}>
      {page && <RevenueCounter totalCents={revenueCents} />}

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{t.hero.eyebrow}</p>
          <h1>{profile?.name ? t.hero.greeting.replace("{name}", profile.name) : t.hero.greetingNoName}</h1>
          <p>{t.hero.text}</p>
        </div>
        <Link className={`flux-button-smooth ${styles.heroAction}`} href="/outil/posts">
          {t.hero.cta} <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      <section className={styles.storefront}>
        <div className={styles.storefrontVisual}>
          <span className={styles.storefrontIcon}><Store aria-hidden="true" /></span>
          <div>
            <p className={styles.eyebrow}>{t.storefront.eyebrow}</p>
            <h2>{page ? page.business_name || t.storefront.titleOnline : t.storefront.titleOffline}</h2>
            <p>{page ? t.storefront.textOnline : t.storefront.textOffline}</p>
          </div>
        </div>

        {page && pageUrl ? (
          <div className={styles.storefrontLink}>
            <Globe2 aria-hidden="true" />
            <code>{pageUrl}</code>
            <CopyButton text={pageUrl} label={t.storefront.copyLink} />
          </div>
        ) : (
          <div className={styles.storefrontEmpty}>
            <Sparkles aria-hidden="true" />
            <span>{t.storefront.emptyText}</span>
          </div>
        )}

        <div className={styles.storefrontActions}>
          <Link className={`flux-button-smooth ${styles.storefrontPrimary}`} href="/ma-page">
            <Pencil aria-hidden="true" />
            {page ? t.storefront.editCta : t.storefront.createCta}
          </Link>
          {page && (
            <Link className={`flux-button-smooth flux-button-smooth-secondary ${styles.storefrontSecondary}`} href={`/p/${page.slug}`} target="_blank">
              {t.storefront.viewCta} <ExternalLink aria-hidden="true" />
            </Link>
          )}
        </div>
      </section>

      <section className={styles.metrics} aria-label={t.metrics.aria}>
        <article className={styles.metric}>
          <span>{t.metrics.readyLabel}</span>
          <strong>{completion}%</strong>
          <small>{completion >= 70 ? t.metrics.voiceGood : t.metrics.voiceContinue}</small>
        </article>
        <article className={styles.metric}>
          <span>{t.metrics.upcomingBookings}</span>
          <strong>{upcomingCount}</strong>
          <small>{t.metrics.agendaSynced}</small>
        </article>
        <article className={styles.metric}>
          <span>{t.metrics.availableCredits}</span>
          <strong>{balance}</strong>
          <small>{generations.length} {generations.length > 1 ? t.metrics.contentPlural : t.metrics.contentSingular}</small>
        </article>
      </section>

      {nextStep && <FluxContextCard messageId={JOURNEY_GUIDANCE_BY_STEP[nextStep.n]} />}

      <div className={styles.sectionHeader}>
        <div><h2>{t.journey.title}</h2><p>{t.journey.subtitle}</p></div>
        <span className={styles.progressLabel}>{t.journey.progress.replace("{completed}", String(completedCount)).replace("{total}", String(total))}</span>
      </div>

      <ol className={styles.journey}>
        {steps.map((step) => (
          <li key={step.n} id={`etape-${step.n}`} className={step.done ? styles.stepDone : styles.step}>
            <span className={styles.stepNumber}>
              {step.done ? "✓" : step.n}
            </span>
            <div>
              <h3>{stepTitle(step.n)}</h3>
              <div className={styles.stepContent}>{stepContent[step.n]}</div>
            </div>
            <span className={styles.status}>{step.done ? t.journey.done : t.journey.todo}</span>
          </li>
        ))}
      </ol>

      {nextStep && (
        <details className={styles.nextDock}>
          <summary>
            <span>
              <small>{t.journey.nextStep}</small>
              <strong>{stepTitle(nextStep.n)}</strong>
            </span>
            <span className={styles.nextDockToggle}>
              <ChevronDown aria-hidden="true" />
            </span>
          </summary>
          <div className={styles.nextDockPanel}>
            <div className={styles.nextDockHeading}>
              <small>{t.journey.todoNow}</small>
              <strong>{stepTitle(nextStep.n)}</strong>
            </div>
            <div className={styles.nextDockActions}>
              <a href={`#etape-${nextStep.n}`}>
                {t.journey.viewStep}
                <ArrowRight aria-hidden="true" />
              </a>
              {(nextStep.n === 7 || nextStep.n === 8) && (
                <form action={completeJourneyStep.bind(null, nextStep.n)}>
                  <button className="flux-button-smooth" type="submit">
                    <Check aria-hidden="true" />
                    {t.journey.validate}
                  </button>
                </form>
              )}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
