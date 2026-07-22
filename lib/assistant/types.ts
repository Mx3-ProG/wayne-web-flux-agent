import type { JourneySignals, JourneyStepId } from "@/lib/journey";

export type AssistantSurface = "marketing" | "onboarding" | "app" | "storefront";

export type AssistantDestination = {
  id: string;
  label: string;
  description: string;
  href: string;
  anchor?: string;
  surfaces: AssistantSurface[];
  aliases: string[];
  keywords: string[];
  journeyStep?: JourneyStepId;
};

export type AssistantContext = {
  surface: AssistantSurface;
  pathname: string;
  activeProjectId?: string;
  journey?: JourneySignals;
  availableDestinationIds?: string[];
};

export type AssistantPreference = {
  enabled: boolean;
  pausedUntil: string | null;
  currentGoalId: string | null;
};

export type AssistantSearchResult = {
  destination: AssistantDestination;
  score: number;
  confidence: "high" | "medium" | "low";
};

export type AssistantEventType =
  | "opened"
  | "suggestion_shown"
  | "suggestion_dismissed"
  | "result_selected"
  | "no_result"
  | "paused"
  | "disabled"
  | "message_seen"
  | "message_dismissed"
  | "action_clicked"
  | "step_completed";

export const DEFAULT_ASSISTANT_PREFERENCE: AssistantPreference = {
  enabled: true,
  pausedUntil: null,
  currentGoalId: null,
};
