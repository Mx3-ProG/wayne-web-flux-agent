import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TOOLS } from "@/lib/tools-config";
import { loadJourneySignals } from "@/lib/journey-signals";
import { journeyState, type JourneyStepId } from "@/lib/journey";
import { CopyButton } from "@/components/copy-button";
import { RevenueCounter } from "@/components/revenue-counter";
import { completeJourneyStep } from "./actions";
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

export const metadata = { title: "Mon espace" };

export default async function EspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, journey] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).single(),
    loadJourneySignals(supabase, user.id),
  ]);
  const { page, generations, balance, revenueCents, signals } = journey;
  const { steps, completedCount, total, nextStep } = journeyState(signals);

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
        <span>{page ? "Ouvrir l’éditeur de vitrine" : "Créer ma vitrine"}</span>
        <ArrowRight aria-hidden="true" />
      </Link>
    ),
    2: (
      <div className={styles.voiceBlock}>
        <p className={styles.voiceScore}>
          J&apos;écris comme toi à <strong>{completion}%</strong>
        </p>
        <div className={styles.voiceMeter}>
          <div style={{ width: `${completion}%` }} />
        </div>
        <p className={styles.stepHint}>
          Plus tu lui en donnes, plus l&apos;IA écrit avec ta voix, ton ton,
          tes mots à toi.
        </p>
        <Link className={styles.journeyAction} href="/contexte">
          <span>
            {completion >= 70 ? "Affiner encore" : "Faire connaissance (2 min)"}
          </span>
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    ),
    3: (
      <Link className={styles.journeyAction} href="/produits/configurer">
        <span>{signals.productCount > 0 ? "Créer d’autres produits avec Flux" : "Lancer la création produit Flux"}</span>
        <ArrowRight aria-hidden="true" />
      </Link>
    ),
    4: (
      <Link className={styles.journeyAction} href="/offres/configurer">
        <span>{signals.offerCount > 0 ? "Créer une nouvelle offre avec Flux" : "Lancer la création d’offre Flux"}</span>
        <ArrowRight aria-hidden="true" />
      </Link>
    ),
    5: (
      <Link className={styles.journeyAction} href="/agenda">
        <span>{signals.openScheduleCount > 0 ? "Revoir mes horaires avec Flux" : "Configurer mes horaires"}</span>
        <ArrowRight aria-hidden="true" />
      </Link>
    ),
    6: (
      <div className={styles.toolsBlock} id="outils">
        <p className={styles.stepHint}>
          Choisis un outil. Le coût en crédits est affiché avant de lancer.
        </p>
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
          <span>crédits restants</span>
          <Link href="/credits">Voir mes crédits</Link>
        </div>
        <div className={styles.resultCard}>
          <strong>{generations.length}</strong>
          <span>
            création{generations.length > 1 ? "s" : ""} dans ton coffre
          </span>
          <Link href="/resultats">Ouvrir mon coffre</Link>
        </div>
        <div className={styles.resultCard}>
          <strong>{upcomingCount}</strong>
          <span>rendez-vous à venir</span>
          <Link href="/agenda">Ouvrir mon agenda</Link>
        </div>
      </div>
    ),
    8: (
      <div className={styles.shareBlock}>
        <p className={styles.stepHint}>
          Bio Instagram, statut WhatsApp, fiche Google : plus ton lien
          circule, plus ton agenda se remplit tout seul.
        </p>
        {pageUrl && (
          <div className={styles.shareRow}>
            <CopyButton text={pageUrl} />
            <a
              className={styles.journeyAction}
              href={`https://wa.me/?text=${encodeURIComponent(`Réserve ton rendez-vous en ligne : ${pageUrl}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              <span>Partager sur WhatsApp</span>
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
          <p className={styles.eyebrow}>Vue d&apos;ensemble</p>
          <h1>{profile?.name ? `Bonjour ${profile.name}` : "Bonjour"}</h1>
          <p>Voici ce qui fait avancer ton commerce aujourd&apos;hui.</p>
        </div>
        <Link className={`flux-button-smooth ${styles.heroAction}`} href="/outil/posts">
          Créer un contenu <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      <section className={styles.storefront}>
        <div className={styles.storefrontVisual}>
          <span className={styles.storefrontIcon}><Store aria-hidden="true" /></span>
          <div>
            <p className={styles.eyebrow}>Ma vitrine</p>
            <h2>{page ? page.business_name || "Ta vitrine est en ligne" : "Crée ton adresse sur le web"}</h2>
            <p>
              {page
                ? "Le lien unique à partager avec tes clients, partout où ils te cherchent."
                : "Une page claire, belle et prête à recevoir tes premières demandes."}
            </p>
          </div>
        </div>

        {page && pageUrl ? (
          <div className={styles.storefrontLink}>
            <Globe2 aria-hidden="true" />
            <code>{pageUrl}</code>
            <CopyButton text={pageUrl} label="Copier le lien" />
          </div>
        ) : (
          <div className={styles.storefrontEmpty}>
            <Sparkles aria-hidden="true" />
            <span>Quelques choix suffisent pour préparer ta première vitrine.</span>
          </div>
        )}

        <div className={styles.storefrontActions}>
          <Link className={`flux-button-smooth ${styles.storefrontPrimary}`} href="/ma-page">
            <Pencil aria-hidden="true" />
            {page ? "Modifier ma vitrine" : "Créer ma vitrine"}
          </Link>
          {page && (
            <Link className={`flux-button-smooth flux-button-smooth-secondary ${styles.storefrontSecondary}`} href={`/p/${page.slug}`} target="_blank">
              Voir ma vitrine <ExternalLink aria-hidden="true" />
            </Link>
          )}
        </div>
      </section>

      <section className={styles.metrics} aria-label="Indicateurs">
        <article className={styles.metric}>
          <span>Ton espace est prêt à</span>
          <strong>{completion}%</strong>
          <small>{completion >= 70 ? "Ta voix est bien configurée" : "Continue de personnaliser ta voix"}</small>
        </article>
        <article className={styles.metric}>
          <span>Rendez-vous à venir</span>
          <strong>{upcomingCount}</strong>
          <small>Agenda synchronisé</small>
        </article>
        <article className={styles.metric}>
          <span>Crédits disponibles</span>
          <strong>{balance}</strong>
          <small>{generations.length} contenu{generations.length > 1 ? "s" : ""} créé{generations.length > 1 ? "s" : ""}</small>
        </article>
      </section>

      <div className={styles.sectionHeader}>
        <div><h2>Ton parcours</h2><p>Une étape claire à la fois.</p></div>
        <span className={styles.progressLabel}><b>{completedCount}</b> / {total} terminé</span>
      </div>

      <ol className={styles.journey}>
        {steps.map((step) => (
          <li key={step.n} id={`etape-${step.n}`} className={step.done ? styles.stepDone : styles.step}>
            <span className={styles.stepNumber}>
              {step.done ? "✓" : step.n}
            </span>
            <div>
              <h3>{step.title}</h3>
              <div className={styles.stepContent}>{stepContent[step.n]}</div>
            </div>
            <span className={styles.status}>{step.done ? "Terminé" : "À faire"}</span>
          </li>
        ))}
      </ol>

      {nextStep && (
        <details className={styles.nextDock}>
          <summary>
            <span>
              <small>Prochaine étape</small>
              <strong>{nextStep.title}</strong>
            </span>
            <span className={styles.nextDockToggle}>
              <ChevronDown aria-hidden="true" />
            </span>
          </summary>
          <div className={styles.nextDockPanel}>
            <div className={styles.nextDockHeading}>
              <small>À faire maintenant</small>
              <strong>{nextStep.title}</strong>
            </div>
            <div className={styles.nextDockActions}>
              <a href={`#etape-${nextStep.n}`}>
                Voir l&apos;étape
                <ArrowRight aria-hidden="true" />
              </a>
              {(nextStep.n === 7 || nextStep.n === 8) && (
                <form action={completeJourneyStep.bind(null, nextStep.n)}>
                  <button className="flux-button-smooth" type="submit">
                    <Check aria-hidden="true" />
                    Valider
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
