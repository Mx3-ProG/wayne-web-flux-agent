export const ASSISTANT_MESSAGES_EXPANDED_KEY = "flux-assistant:messages-expanded";

export function parseAssistantMessagesExpanded(value: string | null) {
  return value !== "false";
}

export function activateAssistantPreference(preference: AssistantPreference): AssistantPreference {
  return { ...preference, enabled: true, pausedUntil: null };
}
import type { AssistantPreference } from "./types";
