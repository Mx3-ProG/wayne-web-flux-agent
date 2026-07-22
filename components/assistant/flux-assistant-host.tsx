"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Clock3,
  Eye,
  HelpCircle,
  Pause,
  Search,
  Sparkles,
  VolumeX,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type {
  AssistantContext,
  AssistantDestination,
  AssistantEventType,
  AssistantPreference,
  AssistantSearchResult,
} from "@/lib/assistant/types";
import { DEFAULT_ASSISTANT_PREFERENCE } from "@/lib/assistant/types";
import {
  ASSISTANT_STORAGE_KEY,
  canPromptAssistant,
  pauseUntil,
  readCombinedCoachingLedger,
  recordAssistantDismissal,
  recordAssistantPrompt,
  writeCombinedCoachingLedger,
} from "@/lib/assistant/coaching";
import {
  searchAssistantDestinations,
  suggestedAssistantDestination,
} from "@/lib/assistant/search";
import { journeyState } from "@/lib/journey";
import { ASSISTANT_MENU_EVENT } from "@/lib/assistant/menu-presence";
import { activateAssistantPreference } from "@/lib/assistant/display";
import { FluxMascot } from "@/components/mascot/flux-mascot";
import { MascotErrorBoundary } from "./mascot-error-boundary";
import styles from "./flux-assistant.module.css";
import { useAssistantI18n } from "./assistant-i18n-provider";

type Props = {
  surface: AssistantContext["surface"];
  context?: Omit<AssistantContext, "surface" | "pathname">;
  initialPreference?: Partial<AssistantPreference>;
  extraDestinations?: AssistantDestination[];
  persistToAccount?: boolean;
  title?: string;
  launcherVisible?: boolean;
  spontaneousSuggestions?: boolean;
};

type HelpNeededDetail = { topicId: string };
const EMPTY_DESTINATIONS: AssistantDestination[] = [];

function readLocalPreference() {
  try {
    const stored = localStorage.getItem(ASSISTANT_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Partial<AssistantPreference>) : {};
  } catch {
    return {};
  }
}

export function FluxAssistantHost({
  surface,
  context: contextInput,
  initialPreference,
  extraDestinations = EMPTY_DESTINATIONS,
  persistToAccount = false,
  title,
  launcherVisible = true,
  spontaneousSuggestions = true,
}: Props) {
  const pathname = usePathname();
  const { copy: t, destinations } = useAssistantI18n();
  const panelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [suggestionVisible, setSuggestionVisible] = useState(false);
  const [disableProposal, setDisableProposal] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [menuVisible, setMenuVisible] = useState(true);
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<AssistantSearchResult[]>([]);
  const [preference, setPreference] = useState<AssistantPreference>({
    ...DEFAULT_ASSISTANT_PREFERENCE,
    ...initialPreference,
  });

  const context = useMemo<AssistantContext>(
    () => ({ surface, pathname, ...contextInput }),
    [surface, pathname, contextInput],
  );
  const suggestion = useMemo(
    () => {
      const currentGoal = [...extraDestinations, ...destinations].find(
        (destination) =>
          destination.id === preference.currentGoalId
          && destination.surfaces.includes(surface)
          && (!context.availableDestinationIds
            || context.availableDestinationIds.includes(destination.id)),
      );
      return currentGoal ?? suggestedAssistantDestination(context, extraDestinations, destinations);
    },
    [context, destinations, extraDestinations, preference.currentGoalId, surface],
  );

  const postState = useCallback(
    (body: Record<string, unknown>) => {
      if (!persistToAccount) return;
      void fetch("/api/assistant/state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      });
    },
    [persistToAccount],
  );

  const track = useCallback(
    (
      eventType: AssistantEventType,
      details: { intentId?: string; confidence?: AssistantSearchResult["confidence"] } = {},
    ) => {
      postState({
        kind: "event",
        eventType,
        surface,
        routeKey: pathname.slice(0, 160),
        intentId: details.intentId,
        confidence: details.confidence,
        pageId: context.activeProjectId,
      });
    },
    [context.activeProjectId, pathname, postState, surface],
  );

  const savePreference = useCallback(
    (next: AssistantPreference) => {
      setPreference(next);
      setPaused(Boolean(next.pausedUntil && new Date(next.pausedUntil).getTime() > Date.now()));
      try {
        localStorage.setItem(ASSISTANT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Le stockage local peut être bloqué : l'assistant reste utilisable.
      }
      postState({ kind: "preference", preference: next });
    },
    [postState],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const next = {
        ...DEFAULT_ASSISTANT_PREFERENCE,
        ...readLocalPreference(),
        ...initialPreference,
      };
      setPreference(next);
      setPaused(Boolean(next.pausedUntil && new Date(next.pausedUntil).getTime() > Date.now()));
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialPreference]);

  useEffect(() => {
    if (!ready || !preference.currentGoalId || !context.journey) return;
    const goal = destinations.find(
      (destination) => destination.id === preference.currentGoalId,
    );
    if (!goal?.journeyStep) return;
    const completed = journeyState(context.journey).steps.some(
      (step) => step.n === goal.journeyStep && step.done,
    );
    if (!completed) return;

    const frame = window.requestAnimationFrame(() => {
      postState({
        kind: "progress",
        topicId: goal.id,
        scopeKey: context.activeProjectId ?? "global",
        status: "completed",
      });
      track("step_completed", { intentId: goal.id });
      savePreference({ ...preference, currentGoalId: null });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [context.activeProjectId, context.journey, destinations, postState, preference, ready, savePreference, track]);

  useEffect(() => {
    const openMenus = new Set<string>();
    function onMenuState(event: Event) {
      const detail = (event as CustomEvent<{ id?: string; open?: boolean }>).detail;
      if (!detail?.id) return;
      if (detail.open) openMenus.add(detail.id);
      else openMenus.delete(detail.id);
      const visible = openMenus.size === 0;
      setMenuVisible(visible);
      if (!visible) {
        setOpen(false);
        setSuggestionVisible(false);
      }
    }
    window.addEventListener(ASSISTANT_MENU_EVENT, onMenuState);
    return () => window.removeEventListener(ASSISTANT_MENU_EVENT, onMenuState);
  }, []);

  useEffect(() => {
    if (!spontaneousSuggestions || !preference.enabled || !suggestion) return;
    const ledger = readCombinedCoachingLedger(window.localStorage, window.sessionStorage);
    if (!canPromptAssistant(preference, ledger, pathname)) return;
    const timer = window.setTimeout(() => {
      setDisableProposal(false);
      setSuggestionVisible(true);
      writeCombinedCoachingLedger(
        window.localStorage,
        window.sessionStorage,
        recordAssistantPrompt(ledger, pathname),
      );
      track("suggestion_shown", { intentId: suggestion.id });
      postState({
        kind: "progress",
        topicId: suggestion.id,
        scopeKey: context.activeProjectId ?? "global",
        status: "active",
        prompted: true,
      });
    }, surface === "storefront" ? 8000 : 5000);
    return () => window.clearTimeout(timer);
  }, [context.activeProjectId, pathname, postState, preference, spontaneousSuggestions, suggestion, surface, track]);

  useEffect(() => {
    function onOpen() {
      if (!preference.enabled || paused) {
        savePreference(activateAssistantPreference(preference));
      }
      setQuery("");
      setResults([]);
      setSearched(false);
      setOpen(true);
      setSuggestionVisible(false);
      setDisableProposal(false);
      track("opened");
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
    window.addEventListener("flux:assistant-open", onOpen);
    return () => window.removeEventListener("flux:assistant-open", onOpen);
  }, [paused, preference, savePreference, track]);

  useEffect(() => {
    function onHelpNeeded(event: Event) {
      const topicId = (event as CustomEvent<HelpNeededDetail>).detail?.topicId;
      if (!topicId) return;
      const destination = [...extraDestinations, ...destinations].find(
        (candidate) =>
          candidate.id === topicId
          && candidate.surfaces.includes(surface)
          && (!context.availableDestinationIds
            || context.availableDestinationIds.includes(candidate.id)),
      );
      if (!destination) return;
      if (!preference.enabled || paused) {
        savePreference(activateAssistantPreference(preference));
      }
      setResults([{ destination, score: 1, confidence: "high" }]);
      setSearched(true);
      setOpen(true);
      setSuggestionVisible(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
    window.addEventListener("flux:assistant-help-needed", onHelpNeeded);
    return () => window.removeEventListener("flux:assistant-help-needed", onHelpNeeded);
  }, [context.availableDestinationIds, destinations, extraDestinations, paused, preference, savePreference, surface]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (
    !ready ||
    process.env.NEXT_PUBLIC_FLUX_ASSISTANT_DISABLED === "true" ||
    !menuVisible
  ) {
    return null;
  }

  function openPanel() {
    if (!preference.enabled || paused) {
      savePreference(activateAssistantPreference(preference));
    }
    setOpen(true);
    setSuggestionVisible(false);
    setDisableProposal(false);
    track("opened");
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  function dismissSuggestion() {
    setSuggestionVisible(false);
    if (!suggestion) return;
    const ledger = readCombinedCoachingLedger(window.localStorage, window.sessionStorage);
    const nextLedger = recordAssistantDismissal(ledger, suggestion.id);
    writeCombinedCoachingLedger(window.localStorage, window.sessionStorage, nextLedger);
    track("suggestion_dismissed", { intentId: suggestion.id });
    postState({
      kind: "progress",
      topicId: suggestion.id,
      scopeKey: context.activeProjectId ?? "global",
      status: "dismissed",
    });
    if ((nextLedger.dismissals[suggestion.id] ?? 0) >= 3) {
      setDisableProposal(true);
      setSuggestionVisible(true);
    }
  }

  function search(event: FormEvent) {
    event.preventDefault();
    const nextResults = searchAssistantDestinations(query, context, extraDestinations, destinations);
    setResults(nextResults);
    setSearched(true);
    if (!nextResults.length) track("no_result");
  }

  function selectResult(result: AssistantSearchResult) {
    const next = { ...preference, currentGoalId: result.destination.id };
    savePreference(next);
    track("result_selected", {
      intentId: result.destination.id,
      confidence: result.confidence,
    });
    postState({
      kind: "progress",
      topicId: result.destination.id,
      scopeKey: context.activeProjectId ?? "global",
      status: "active",
    });
    setOpen(false);
  }

  function pause(duration: "hour" | "day" | "week") {
    savePreference({ ...preference, pausedUntil: pauseUntil(duration) });
    setOpen(false);
    track("paused");
  }

  function disable() {
    savePreference({ ...preference, enabled: false, pausedUntil: null });
    setOpen(false);
    track("disabled");
  }

  const defaultStarterIds = surface === "marketing"
    ? ["marketing-features", "marketing-start", "marketing-login"]
    : surface === "onboarding"
      ? ["onboarding-resume", "storefront-editor", "voice"]
      : surface === "app"
        ? ["app-home", "storefront-editor", "agenda"]
        : [];
  const defaultStarters = defaultStarterIds
    .map((id) => destinations.find((destination) => destination.id === id))
    .filter((destination): destination is AssistantDestination => Boolean(destination));
  const starterDestinations = [
    suggestion,
    ...extraDestinations,
    ...defaultStarters,
  ].filter((destination, index, all): destination is AssistantDestination =>
    Boolean(destination) && all.findIndex((candidate) => candidate?.id === destination?.id) === index,
  ).slice(0, 3);
  const heading = title ?? (surface === "storefront" ? t.storefrontHeading : t.heading);

  return (
    <div className={styles.layer} data-surface={surface}>
      {suggestionVisible && (suggestion || disableProposal) && (
        <section className={styles.suggestion} aria-live="polite">
          <button
            className={styles.suggestionClose}
            type="button"
            onClick={() => {
              if (disableProposal) {
                setDisableProposal(false);
                setSuggestionVisible(false);
              } else {
                dismissSuggestion();
              }
            }}
            aria-label={t.closeTip}
          >
            <X aria-hidden="true" />
          </button>
          {disableProposal ? (
            <>
              <span className={styles.suggestionEyebrow}><Pause aria-hidden="true" /> {t.choose}</span>
              <strong>{t.stopQuestion}</strong>
              <p>{t.stopBody}</p>
              <div className={styles.suggestionActions}>
                <button type="button" className={styles.dangerAction} onClick={disable}>{t.disable}</button>
                <button type="button" onClick={() => { setDisableProposal(false); setSuggestionVisible(false); }}>{t.keep}</button>
              </div>
            </>
          ) : suggestion ? (
            <>
              <span className={styles.suggestionEyebrow}><Sparkles aria-hidden="true" /> {t.guides}</span>
              <strong>{suggestion.label}</strong>
              <p>{suggestion.description}</p>
              <div className={styles.suggestionActions}>
                <Link href={suggestion.href} onClick={() => selectResult({ destination: suggestion, score: 1, confidence: "high" })}>
                  {t.takeMe} <ArrowRight aria-hidden="true" />
                </Link>
                <button type="button" onClick={openPanel}>{t.other}</button>
              </div>
            </>
          ) : null}
        </section>
      )}

      {launcherVisible && (
        <button
          type="button"
          className={styles.launcher}
          aria-controls={panelId}
          aria-expanded={open}
          aria-label={!preference.enabled || paused ? t.resume : t.open}
          onClick={openPanel}
        >
          <span className={styles.launcherPortrait}>
            <Image src="/flux-guide-transparent.webp" alt="" width={384} height={384} priority={false} />
          </span>
          <span className={styles.launcherLabel}>{!preference.enabled || paused ? t.resume : t.launcher}</span>
        </button>
      )}

      {open && (
        <>
          <button className={styles.backdrop} type="button" onClick={() => setOpen(false)} aria-label={t.close} />
          <aside ref={panelRef} id={panelId} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={`${panelId}-title`}>
            <header className={styles.header}>
              <div className={styles.identity}>
                <span><Image src="/flux-guide-transparent.webp" alt="" width={384} height={384} /></span>
                <div><small>{t.guide}</small><strong>FLUX</strong></div>
              </div>
              <button ref={closeRef} type="button" className={styles.iconButton} onClick={() => setOpen(false)} aria-label={t.close}>
                <X aria-hidden="true" />
              </button>
            </header>

            <div className={styles.content}>
              {show3D ? (
                <section className={styles.mascotStage} aria-label={t.mascot3d}>
                  <MascotErrorBoundary>
                    <FluxMascot
                      behavior="follow-pointer"
                      interaction="rotate"
                      width="100%"
                      height="260px"
                      ariaLabel={t.mascot3dAria}
                    />
                  </MascotErrorBoundary>
                  <button type="button" onClick={() => setShow3D(false)}><Eye aria-hidden="true" /> {t.backToHelp}</button>
                </section>
              ) : (
                <>
                  <section className={styles.intro}>
                    <span className={styles.eyebrow}><HelpCircle aria-hidden="true" /> {t.question}</span>
                    <h2 id={`${panelId}-title`}>{heading}</h2>
                    <p>{surface === "storefront" ? t.storefrontIntro : t.intro}</p>
                  </section>

                  <form className={styles.searchForm} onSubmit={search}>
                    <Search aria-hidden="true" />
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={surface === "storefront" ? t.storefrontPlaceholder : t.placeholder}
                      aria-label={t.searchAria}
                      autoComplete="off"
                    />
                    <button type="submit" disabled={query.trim().length < 2}>{t.find}</button>
                  </form>

                  {searched ? (
                    results.length > 0 ? (
                      <section className={styles.results} aria-live="polite">
                        <h3>{t.results}</h3>
                        {results.map((result) => (
                          <Link key={result.destination.id} href={result.destination.href} onClick={() => selectResult(result)}>
                            <span><strong>{result.destination.label}</strong><small>{result.destination.description}</small></span>
                            <ArrowRight aria-hidden="true" />
                          </Link>
                        ))}
                      </section>
                    ) : (
                      <section className={styles.empty} aria-live="polite">
                        <strong>{t.noResult}</strong>
                        <p>{t.noResultHint}</p>
                        <div className={styles.emptyLinks}>
                          {starterDestinations.map((destination) => (
                            <Link key={destination.id} href={destination.href} onClick={() => selectResult({ destination, score: 1, confidence: "high" })}>
                              {destination.label}
                            </Link>
                          ))}
                        </div>
                      </section>
                    )
                  ) : starterDestinations.length > 0 ? (
                    <section className={styles.quickLinks}>
                      <h3>{surface === "storefront" ? t.quick : t.useful}</h3>
                      {starterDestinations.map((destination) => (
                        <Link key={destination.id} href={destination.href} onClick={() => selectResult({ destination, score: 1, confidence: "high" })}>
                          <span><strong>{destination.label}</strong><small>{destination.description}</small></span>
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      ))}
                    </section>
                  ) : null}

                  {surface === "app" && (
                    <button type="button" className={styles.viewMascot} onClick={() => setShow3D(true)}>
                      <Eye aria-hidden="true" /> {t.view3d}
                    </button>
                  )}
                </>
              )}
            </div>

            <footer className={styles.footer}>
              <details>
                <summary><Pause aria-hidden="true" /> {t.pause}</summary>
                <div className={styles.pauseOptions}>
                  <button type="button" onClick={() => pause("hour")}><Clock3 aria-hidden="true" /> {t.hour}</button>
                  <button type="button" onClick={() => pause("day")}>{t.day}</button>
                  <button type="button" onClick={() => pause("week")}>{t.week}</button>
                </div>
              </details>
              <button type="button" className={styles.disable} onClick={disable}><VolumeX aria-hidden="true" /> {t.disable}</button>
            </footer>
          </aside>
        </>
      )}
    </div>
  );
}
