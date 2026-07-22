import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const assistantCss = readFileSync(
  new URL("../../components/assistant/flux-assistant.module.css", import.meta.url),
  "utf8",
);

test("le centrage du lanceur onboarding ne limite pas le panneau fixe", () => {
  const onboardingLayerRule = assistantCss.match(
    /\.layer\[data-surface="onboarding"\]\s*\{([^}]*)\}/,
  )?.[1];

  assert.ok(onboardingLayerRule, "la règle responsive onboarding doit exister");
  assert.match(onboardingLayerRule, /left:\s*calc\(50%\s*-\s*28px\)/);
  assert.doesNotMatch(onboardingLayerRule, /transform\s*:/);
});
