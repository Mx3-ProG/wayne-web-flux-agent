import type { AssistantPreference } from "./types";

const STORAGE_PREFIX = "flux-assistant";
const DAY_MS = 86_400_000;

export type CoachingLedger = {
  day: string;
  spontaneousCount: number;
  promptedRoutes: string[];
  dismissals: Record<string, number>;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyLedger(): CoachingLedger {
  return { day: today(), spontaneousCount: 0, promptedRoutes: [], dismissals: {} };
}

export function readCoachingLedger(storage: Storage): CoachingLedger {
  try {
    const parsed = JSON.parse(storage.getItem(`${STORAGE_PREFIX}:coaching`) ?? "null") as CoachingLedger | null;
    if (!parsed) return emptyLedger();
    if (parsed.day !== today()) {
      return { ...emptyLedger(), dismissals: parsed.dismissals ?? {} };
    }
    return parsed;
  } catch {
    return emptyLedger();
  }
}

export function writeCoachingLedger(storage: Storage, ledger: CoachingLedger) {
  storage.setItem(`${STORAGE_PREFIX}:coaching`, JSON.stringify(ledger));
}

export function readCombinedCoachingLedger(local: Storage, session: Storage): CoachingLedger {
  const daily = readCoachingLedger(local);
  const currentSession = readCoachingLedger(session);
  return { ...daily, promptedRoutes: currentSession.promptedRoutes };
}

export function writeCombinedCoachingLedger(
  local: Storage,
  session: Storage,
  ledger: CoachingLedger,
) {
  writeCoachingLedger(local, { ...ledger, promptedRoutes: [] });
  writeCoachingLedger(session, {
    ...ledger,
    spontaneousCount: 0,
    dismissals: {},
  });
}

export function canPromptAssistant(
  preference: AssistantPreference,
  ledger: CoachingLedger,
  pathname: string,
  now = Date.now(),
) {
  if (!preference.enabled) return false;
  if (preference.pausedUntil && new Date(preference.pausedUntil).getTime() > now) return false;
  if (ledger.spontaneousCount >= 3) return false;
  return !ledger.promptedRoutes.includes(pathname);
}

export function recordAssistantPrompt(ledger: CoachingLedger, pathname: string): CoachingLedger {
  return {
    ...ledger,
    spontaneousCount: ledger.spontaneousCount + 1,
    promptedRoutes: [...new Set([...ledger.promptedRoutes, pathname])],
  };
}

export function recordAssistantDismissal(ledger: CoachingLedger, topicId: string): CoachingLedger {
  return {
    ...ledger,
    dismissals: { ...ledger.dismissals, [topicId]: (ledger.dismissals[topicId] ?? 0) + 1 },
  };
}

export function pauseUntil(duration: "hour" | "day" | "week") {
  const durationMs = duration === "hour" ? 3_600_000 : duration === "day" ? DAY_MS : 7 * DAY_MS;
  return new Date(Date.now() + durationMs).toISOString();
}

export const ASSISTANT_STORAGE_KEY = `${STORAGE_PREFIX}:preference`;
