"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getVertical, type VerticalKind } from "@/lib/verticals";
import { JOURNEY_STEPS, type JourneyChapterId, type JourneyStepState } from "@/lib/journey";
import type { TunnelDraft } from "@/lib/types";
import { completeJourneyStep } from "@/app/(app)/espace/actions";
import {
  finishTunnel,
  saveTunnelDraft,
  tunnelCreateCatalog,
  tunnelCreateOffer,
  tunnelCreatePage,
  tunnelSaveSchedules,
  tunnelSaveVoice,
} from "./actions";
import { TunnelShell } from "@/components/tunnel/tunnel-shell";
import { ChapterIntro } from "@/components/tunnel/chapter-intro";
import { ChapterDone } from "@/components/tunnel/chapter-done";
import { VitrinePreview, type PreviewState } from "@/components/tunnel/vitrine-preview";
import { StepVertical } from "@/components/tunnel/steps/step-vertical";
import { StepGoals } from "@/components/tunnel/steps/step-goals";
import { StepIdentity } from "@/components/tunnel/steps/step-identity";
import { StepVoice } from "@/components/tunnel/steps/step-voice";
import { StepCatalog, type CatalogState } from "@/components/tunnel/steps/step-catalog";
import { StepOffer, type OfferState } from "@/components/tunnel/steps/step-offer";
import { StepAgenda } from "@/components/tunnel/steps/step-agenda";
import { StepContent } from "@/components/tunnel/steps/step-content";
import { StepResults } from "@/components/tunnel/steps/step-results";
import { StepShare } from "@/components/tunnel/steps/step-share";
import styles from "./tunnel.module.css";

// Écrans du tunnel. Les charnières et célébrations sont des vues dérivées : le
// vrai état d'avancement, lui, vit en base (Parcours partagé avec /espace).
const SCREEN = {
  whyChapter1: 1,
  vertical: 2,
  goals: 3,
  identity: 4,
  voice: 5,
  doneChapter1: 6,
  whyChapter2: 7,
  catalog: 8,
  offer: 9,
  agenda: 10,
  doneChapter2: 11,
  whyChapter3: 12,
  content: 13,
  results: 14,
  share: 15,
  doneChapter3: 16,
} as const;

const FIRST_SCREEN = SCREEN.whyChapter1;
const LAST_SCREEN = SCREEN.doneChapter3;

// Écrans pilotés par la barre du bas. Les charnières et célébrations portent
// leur propre bouton : leur donner aussi le footer afficherait deux CTA.
const FOOTER_SCREENS: number[] = [
  SCREEN.vertical,
  SCREEN.goals,
  SCREEN.identity,
  SCREEN.voice,
  SCREEN.catalog,
  SCREEN.offer,
  SCREEN.agenda,
  SCREEN.content,
  SCREEN.results,
  SCREEN.share,
];

// Écrans où l'on construit la vitrine : ce sont les seuls à afficher l'aperçu,
// donc les seuls à passer en deux colonnes. Les charnières, les célébrations et
// la fin du Parcours sont des moments plein cadre, centrés.
//
// Cette liste pilote À LA FOIS la classe de mise en page et le montage de
// l'aperçu : les dissocier laissait une colonne vide qui décalait tout le
// contenu vers la gauche.
const PREVIEW_SCREENS: number[] = [
  SCREEN.vertical,
  SCREEN.goals,
  SCREEN.identity,
  SCREEN.voice,
  SCREEN.catalog,
  SCREEN.offer,
  SCREEN.agenda,
];

type Props = {
  firstName: string;
  draft: TunnelDraft;
  cursor: number;
  trialDays: number;
  steps: JourneyStepState[];
  completedCount: number;
  total: number;
  // Calculée côté serveur : window n'existe pas au premier rendu.
  pageUrl: string | null;
  balance: number;
  generationCount: number;
  upcomingBookings: number;
};

function gainOf(n: number): string {
  return JOURNEY_STEPS.find((step) => step.n === n)?.gain ?? "";
}

export function Tunnel(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Le curseur est repris depuis profiles.onboarding_step : quitter le tunnel et
  // revenir redépose l'utilisateur sur son écran, pas au début.
  const [screen, setScreen] = useState(() =>
    Math.min(LAST_SCREEN, Math.max(FIRST_SCREEN, props.cursor || FIRST_SCREEN))
  );

  const [vertical, setVertical] = useState(props.draft.vertical ?? "");
  const [goals, setGoals] = useState<string[]>(props.draft.goals ?? []);
  const [businessName, setBusinessName] = useState(props.draft.businessName ?? "");
  const [jobTitle, setJobTitle] = useState(props.draft.jobTitle ?? "");
  const [city, setCity] = useState(props.draft.city ?? "");
  const [tone, setTone] = useState(props.draft.tone ?? "");
  const [catalog, setCatalog] = useState<CatalogState>({
    categoryName: "",
    productName: "",
    productPrice: "",
    trackStock: true,
    productStock: "1",
  });
  const [offer, setOffer] = useState<OfferState>({
    offerTitle: "",
    offerDescription: "",
    offerPrice: "",
    offerCompareAt: "",
  });
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("18:00");

  const kind: VerticalKind = vertical ? getVertical(vertical).kind : "hybrid";
  // Une boutique pure n'a pas d'agenda : l'écran disparaît, exactement comme
  // l'étape 5 disparaît du Parcours (lib/journey.ts appliesTo).
  const hasAgenda = kind !== "product";

  const preview: PreviewState = {
    vertical,
    businessName,
    jobTitle,
    city,
    tone,
    categoryName: catalog.categoryName,
    productName: catalog.productName,
    productPrice: catalog.productPrice,
    offerTitle: offer.offerTitle,
    offerPrice: offer.offerPrice,
    days: hasAgenda ? days : [],
    openingTime,
    closingTime,
  };

  const chapter: JourneyChapterId =
    screen <= SCREEN.doneChapter1 ? 1 : screen <= SCREEN.doneChapter2 ? 2 : 3;

  // Une seule source pour la mise en page ET l'aperçu : deux colonnes seulement
  // quand il y a réellement quelque chose à mettre dans la seconde.
  const showPreview = PREVIEW_SCREENS.includes(screen);

  const canContinue = useMemo(() => {
    if (screen === SCREEN.vertical) return Boolean(vertical);
    if (screen === SCREEN.goals) return goals.length > 0;
    if (screen === SCREEN.identity)
      return Boolean(businessName.trim() && jobTitle.trim() && city.trim());
    if (screen === SCREEN.voice) return Boolean(tone);
    if (screen === SCREEN.catalog)
      return Boolean(
        catalog.categoryName.trim() &&
          catalog.productName.trim() &&
          // Un prix vide n'est pas un prix à 0 : Number("") vaut 0, d'où le test
          // explicite sur la chaîne.
          catalog.productPrice.trim() !== "" &&
          Number(catalog.productPrice) >= 0 &&
          (!catalog.trackStock || Number(catalog.productStock) >= 0)
      );
    if (screen === SCREEN.offer)
      return Boolean(offer.offerTitle.trim() && offer.offerPrice.trim() !== "");
    if (screen === SCREEN.agenda) return days.length > 0 && openingTime < closingTime;
    return true;
  }, [screen, vertical, goals, businessName, jobTitle, city, tone, catalog, offer, days, openingTime, closingTime]);

  function goTo(next: number) {
    setError("");
    setScreen(next);
  }

  function nextScreen(from: number): number {
    const next = from + 1;
    if (next === SCREEN.agenda && !hasAgenda) return next + 1;
    return Math.min(LAST_SCREEN, next);
  }

  function prevScreen(from: number): number {
    const previous = from - 1;
    if (previous === SCREEN.agenda && !hasAgenda) return previous - 1;
    return Math.max(FIRST_SCREEN, previous);
  }

  // Chaque avancée écrit en base avant de bouger : c'est tout l'intérêt du
  // tunnel connecté. Si l'écriture échoue, on reste sur l'écran avec le message.
  function advance() {
    if (!canContinue || pending) return;
    const target = nextScreen(screen);

    startTransition(async () => {
      let result: { error?: string } = {};

      if (screen === SCREEN.identity) {
        result = await tunnelCreatePage({ vertical, businessName, jobTitle, city });
      } else if (screen === SCREEN.voice) {
        result = await tunnelSaveVoice({ tone, jobTitle, goals });
      } else if (screen === SCREEN.catalog) {
        result = await tunnelCreateCatalog({
          categoryName: catalog.categoryName,
          productName: catalog.productName,
          priceCents: Math.round(Number(catalog.productPrice) * 100),
          // Le suivi de stock n'a pas de sens pour une prestation.
          trackStock: kind === "service" ? false : catalog.trackStock,
          stock: Number(catalog.productStock),
        });
      } else if (screen === SCREEN.offer) {
        result = await tunnelCreateOffer({
          title: offer.offerTitle,
          description: offer.offerDescription,
          priceCents: Math.round(Number(offer.offerPrice) * 100),
          compareAtCents: offer.offerCompareAt.trim()
            ? Math.round(Number(offer.offerCompareAt) * 100)
            : null,
        });
      } else if (screen === SCREEN.agenda) {
        result = await tunnelSaveSchedules({ days, openingTime, closingTime });
      } else if (screen === SCREEN.results) {
        await completeJourneyStep(7);
      } else if (screen === SCREEN.share) {
        await completeJourneyStep(8);
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      // Les écrans sans écriture métier (verticale, objectifs) posent quand même
      // leur brouillon : ces réponses n'ont pas encore de ligne en base.
      await saveTunnelDraft(
        { vertical, goals, businessName, jobTitle, city, tone },
        target
      );

      setError("");
      setScreen(target);
      // Le Parcours affiché en tête (X/8) est recalculé côté serveur.
      router.refresh();
    });
  }

  const chapter1Achievements = [
    `Ta vitrine « ${businessName.trim() || "ton commerce"} » est créée`,
    "L'IA a appris ton ton et ton métier",
  ];
  const chapter2Achievements = [
    `Ta première ${kind === "service" ? "prestation" : "offre produit"} est en ligne`,
    "Ton offre d'accroche est prête",
    ...(hasAgenda ? ["Tes clients peuvent réserver un créneau"] : []),
  ];

  return (
    <main className={styles.page}>
      <TunnelShell
        chapter={chapter}
        completedCount={props.completedCount}
        total={props.total}
        trialDays={props.trialDays}
      >
        <section className={showPreview ? styles.stageSplit : styles.stage}>
          <div className={styles.stageMain}>
            {screen === SCREEN.whyChapter1 && (
              <ChapterIntro chapter={1} onNext={() => goTo(nextScreen(screen))} />
            )}

            {screen === SCREEN.vertical && (
              <StepVertical
                value={vertical}
                onChange={(slug) => {
                  setVertical(slug);
                  // Le métier le plus courant de la verticale, pré-rempli : une
                  // suggestion, pas une contrainte — l'écran suivant l'édite.
                  if (!jobTitle.trim()) setJobTitle(getVertical(slug).jobTitles[0]);
                }}
              />
            )}

            {screen === SCREEN.goals && (
              <StepGoals
                value={goals}
                onToggle={(id) =>
                  setGoals((current) =>
                    current.includes(id)
                      ? current.filter((item) => item !== id)
                      : [...current, id]
                  )
                }
              />
            )}

            {screen === SCREEN.identity && (
              <StepIdentity
                businessName={businessName}
                jobTitle={jobTitle}
                city={city}
                gain={gainOf(1)}
                onChange={(patch) => {
                  if (patch.businessName !== undefined) setBusinessName(patch.businessName);
                  if (patch.jobTitle !== undefined) setJobTitle(patch.jobTitle);
                  if (patch.city !== undefined) setCity(patch.city);
                }}
              />
            )}

            {screen === SCREEN.voice && (
              <StepVoice value={tone} gain={gainOf(2)} onChange={setTone} />
            )}

            {screen === SCREEN.doneChapter1 && (
              <ChapterDone
                chapter={1}
                achievements={chapter1Achievements}
                onNext={() => goTo(nextScreen(screen))}
              />
            )}

            {screen === SCREEN.whyChapter2 && (
              <ChapterIntro chapter={2} onNext={() => goTo(nextScreen(screen))} />
            )}

            {screen === SCREEN.catalog && (
              <StepCatalog
                kind={kind}
                state={catalog}
                gain={gainOf(3)}
                onChange={(patch) => setCatalog((current) => ({ ...current, ...patch }))}
              />
            )}

            {screen === SCREEN.offer && (
              <StepOffer
                state={offer}
                gain={gainOf(4)}
                onChange={(patch) => setOffer((current) => ({ ...current, ...patch }))}
              />
            )}

            {screen === SCREEN.agenda && hasAgenda && (
              <StepAgenda
                days={days}
                openingTime={openingTime}
                closingTime={closingTime}
                gain={gainOf(5)}
                onChange={(patch) => {
                  if (patch.days !== undefined) setDays(patch.days);
                  if (patch.openingTime !== undefined) setOpeningTime(patch.openingTime);
                  if (patch.closingTime !== undefined) setClosingTime(patch.closingTime);
                }}
              />
            )}

            {screen === SCREEN.doneChapter2 && (
              <ChapterDone
                chapter={2}
                achievements={chapter2Achievements}
                onNext={() => goTo(nextScreen(screen))}
              />
            )}

            {screen === SCREEN.whyChapter3 && (
              <ChapterIntro chapter={3} onNext={() => goTo(nextScreen(screen))} />
            )}

            {screen === SCREEN.content && (
              <StepContent
                gain={gainOf(6)}
                balance={props.balance}
                done={props.generationCount > 0}
                onDone={() => router.refresh()}
              />
            )}

            {screen === SCREEN.results && (
              <StepResults
                balance={props.balance}
                generationCount={props.generationCount}
                upcomingBookings={props.upcomingBookings}
                gain={gainOf(7)}
              />
            )}

            {screen === SCREEN.share && (
              <StepShare
                pageUrl={props.pageUrl}
                gain={gainOf(8)}
                onShared={() => {
                  startTransition(async () => {
                    await completeJourneyStep(8);
                    router.refresh();
                  });
                }}
              />
            )}

            {screen === SCREEN.doneChapter3 && (
              <ChapterDone
                chapter={3}
                achievements={props.steps.filter((s) => s.done).map((s) => s.title)}
                ctaLabel="Entrer dans mon espace"
                pending={pending}
                onNext={() => startTransition(() => finishTunnel())}
              />
            )}

            {error && <p className={styles.error}>{error}</p>}
          </div>

          {/* Monté hors du switch : le remonter à chaque écran tuerait les
              transitions CSS qui font toute la révélation vivante. */}
          {showPreview && <VitrinePreview state={preview} />}
        </section>

        {FOOTER_SCREENS.includes(screen) && (
          <footer className={styles.controls}>
            <button type="button" onClick={() => goTo(prevScreen(screen))} disabled={pending}>
              <ArrowLeft aria-hidden="true" /> Retour
            </button>
            <button
              className={`flux-button-smooth ${styles.primary}`}
              type="button"
              onClick={advance}
              disabled={!canContinue || pending}
            >
              {pending ? "Un instant…" : "Continuer"}
              {!pending && <ArrowRight aria-hidden="true" />}
            </button>
          </footer>
        )}
      </TunnelShell>
    </main>
  );
}
