import assert from "node:assert/strict";
import test from "node:test";
import { activateAssistantPreference, parseAssistantMessagesExpanded } from "./display";
import { DEFAULT_ASSISTANT_PREFERENCE } from "./types";

test("les prises de parole sont développées par défaut", () => {
  assert.equal(parseAssistantMessagesExpanded(null), true);
  assert.equal(parseAssistantMessagesExpanded("true"), true);
});

test("la réduction des prises de parole est persistante", () => {
  assert.equal(parseAssistantMessagesExpanded("false"), false);
});

test("un clic sur le lanceur réactive un assistant désactivé ou en pause", () => {
  const activated = activateAssistantPreference({
    ...DEFAULT_ASSISTANT_PREFERENCE,
    enabled: false,
    pausedUntil: "2099-01-01T00:00:00.000Z",
  });
  assert.equal(activated.enabled, true);
  assert.equal(activated.pausedUntil, null);
});
