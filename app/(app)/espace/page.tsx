import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePage } from "@/lib/active-project";
import type { Generation, VoiceProfile } from "@/lib/types";
import { TOOLS } from "@/lib/tools-config";
import { voiceCompletion } from "@/lib/voice";
import { parisNow } from "@/lib/slots";
import { Button } from "@/components/ui/button";
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

type Step = {
  n: number;
  title: string;
  done: boolean;
  content: React.ReactNode;
};

export default async function EspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, page] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).single(),
    getActivePage(supabase, user.id),
  ]);
  // Voix du projet actif (voix par projet).
  const { data: voice } = page
    ? await supabase
        .from("voice_profiles")
        .select("*")
        .eq("page_id", page.id)
        .maybeSingle<VoiceProfile>()
    : { data: null as VoiceProfile | null };

  let upcomingCount = 0;
  let generations: Generation[] = [];
  let revenueCents = 0;
  let productCount = 0;
  let offerCount = 0;
  let scheduleCount = 0;
  if (page) {
    const today = parisNow().date;
    const { data: rev } = await supabase.rpc("revenue_total", {
      p_page: page.id,
    });
    revenueCents = Number(rev ?? 0);
    const [
      { count },
      { data: gens },
      { count: products },
      { count: offers },
      { count: schedules },
    ] = await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("page_id", page.id)
        .eq("status", "confirmed")
        .gte("date", today),
      supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .eq("page_id", page.id)
        .limit(5),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("page_id", page.id),
      supabase
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("page_id", page.id),
      supabase
        .from("schedules")
        .select("weekday", { count: "exact", head: true })
        .eq("page_id", page.id)
        .eq("open", true),
    ]);
    upcomingCount = count ?? 0;
    generations = (gens ?? []) as Generation[];
    productCount = products ?? 0;
    offerCount = offers ?? 0;
    scheduleCount = schedules ?? 0;
  }

  const { data: balance } = await supabase.rpc("credit_balance", {
    uid: user.id,
  });

  const completion = voiceCompletion(voice, !!page);
  const pageUrl = page
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/p/${page.slug}`
    : null;

  const steps: Step[] = [
    {
      n: 1,
      title: "Crée ta vitrine",
      done: !!page,
      content: (
        <Link className={styles.journeyAction} href="/ma-page">
          <span>{page ? "Ouvrir l’éditeur de vitrine" : "Créer ma vitrine"}</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      ),
    },
    {
      n: 2,
      title: "Apprends-lui à parler comme toi",
      done: completion >= 70,
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            J&apos;écris comme toi à{" "}
            <strong className="text-red-bright">{completion}%</strong>
          </p>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden max-w-xs">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${completion}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Plus tu lui en donnes, plus l&apos;IA écrit avec ta voix, ton ton,
            tes mots à toi.
          </p>
          <Button asChild variant={completion >= 70 ? "secondary" : "default"} size="sm">
            <Link href="/contexte">
              {completion >= 70 ? "Affiner encore" : "Faire connaissance (2 min)"}
            </Link>
          </Button>
        </div>
      ),
    },
    {
      n: 3,
      title: "Crée ton produit",
      done: productCount > 0,
      content: (
        <Link className={styles.journeyAction} href="/produits/configurer">
          <span>{productCount > 0 ? "Créer d’autres produits avec Flux" : "Lancer la création produit Flux"}</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      ),
    },
    {
      n: 4,
      title: "Crée tes offres",
      done: offerCount > 0,
      content: (
        <Link className={styles.journeyAction} href="/offres/configurer">
          <span>{offerCount > 0 ? "Créer une nouvelle offre avec Flux" : "Lancer la création d’offre Flux"}</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      ),
    },
    {
      n: 5,
      title: "Crée ton agenda",
      done: scheduleCount > 0,
      content: (
        <Link className={styles.journeyAction} href="/agenda">
          <span>{scheduleCount > 0 ? "Revoir mes horaires avec Flux" : "Configurer mes horaires"}</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      ),
    },
    {
      n: 6,
      title: "Crée ton premier contenu",
      done: generations.length > 0,
      content: (
        <div className="space-y-3" id="outils">
          <p className="text-sm text-muted-foreground">
            Choisis un outil. Le coût en crédits est affiché avant de lancer.
          </p>
          <div className="grid sm:grid-cols-3 gap-2">
            {TOOLS.map((tool) => (
              <Link
                key={tool.slug}
                href={`/outil/${tool.slug}`}
                className="rounded-xl border border-border p-3 hover:border-primary/60 hover:bg-primary/5 transition-colors"
              >
                {tool.badge && (
                  <span className="block text-[10px] uppercase tracking-wide text-red-bright mb-1">
                    {tool.badge}
                  </span>
                )}
                <span className="block font-medium text-sm mb-1">
                  {tool.name}
                </span>
                <span className="block text-xs text-muted-foreground mb-2">
                  {tool.tagline}
                </span>
                <span className="text-xs font-medium">{tool.cost} cr.</span>
              </Link>
            ))}
          </div>
        </div>
      ),
    },
    {
      n: 7,
      title: "Regarde tes résultats",
      done: upcomingCount > 0 || (page?.journey_completed_steps ?? []).includes(7),
      content: (
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border p-4">
            <p className="text-2xl font-bold">{balance ?? 0}</p>
            <p className="text-xs text-muted-foreground">crédits restants</p>
            <Link
              href="/credits"
              className="text-xs underline underline-offset-4"
            >
              Voir mes crédits
            </Link>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-2xl font-bold">{generations.length}</p>
            <p className="text-xs text-muted-foreground">
              création{generations.length > 1 ? "s" : ""} dans ton coffre
            </p>
            <Link
              href="/resultats"
              className="text-xs underline underline-offset-4"
            >
              Ouvrir mon coffre
            </Link>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-2xl font-bold">{upcomingCount}</p>
            <p className="text-xs text-muted-foreground">
              rendez-vous à venir
            </p>
            <Link href="/agenda" className="text-xs underline underline-offset-4">
              Ouvrir mon agenda
            </Link>
          </div>
        </div>
      ),
    },
    {
      n: 8,
      title: "Partage ton business partout",
      done: (page?.journey_completed_steps ?? []).includes(8),
      content: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Bio Instagram, statut WhatsApp, fiche Google : plus ton lien
            circule, plus ton agenda se remplit tout seul.
          </p>
          {pageUrl && (
            <div className="flex flex-wrap gap-2">
              <CopyButton text={pageUrl} />
              <Button asChild variant="secondary" size="sm">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Réserve ton rendez-vous en ligne : ${pageUrl}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Partager sur WhatsApp
                </a>
              </Button>
            </div>
          )}
        </div>
      ),
    },
  ];

  const nextStep = steps.find((step) => !step.done);
  const completedCount = steps.filter((step) => step.done).length;

  return (
    <div className={styles.page}>
      {page && <RevenueCounter totalCents={revenueCents} />}

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Vue d&apos;ensemble</p>
          <h1>{profile?.name ? `Bonjour ${profile.name}` : "Bonjour"}</h1>
          <p>Voici ce qui fait avancer ton commerce aujourd&apos;hui.</p>
        </div>
        <Link className={styles.heroAction} href="/outil/posts">
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
          <Link className={styles.storefrontPrimary} href="/ma-page">
            <Pencil aria-hidden="true" />
            {page ? "Modifier ma vitrine" : "Créer ma vitrine"}
          </Link>
          {page && (
            <Link className={styles.storefrontSecondary} href={`/p/${page.slug}`} target="_blank">
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
          <strong>{balance ?? 0}</strong>
          <small>{generations.length} contenu{generations.length > 1 ? "s" : ""} créé{generations.length > 1 ? "s" : ""}</small>
        </article>
      </section>

      <div className={styles.sectionHeader}>
        <div><h2>Ton parcours</h2><p>Une étape claire à la fois.</p></div>
        <span className={styles.progressLabel}><b>{completedCount}</b> / 8 terminé</span>
      </div>

      <ol className={styles.journey}>
        {steps.map((step) => (
          <li key={step.n} id={`etape-${step.n}`} className={step.done ? styles.stepDone : styles.step}>
            <span className={styles.stepNumber}>
              {step.done ? "✓" : step.n}
            </span>
            <div>
              <h3>{step.title}</h3>
              <div className={styles.stepContent}>{step.content}</div>
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
                  <button type="submit">
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
