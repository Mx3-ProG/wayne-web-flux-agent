import assert from "node:assert/strict";
import test from "node:test";
import { contrastRatio, deriveStorefrontTokens } from "./palette.ts";

const kit = {
  defaults: { colors: { primary: "#ff0000", dark: "#08090b", background: "#faf8f4", card: "#ffffff" } },
};

for (const mode of ["light", "dark"]) {
  for (const accent of ["#ffffff", "#000000", "#ff00ff", "#ffff00"]) {
    test(`${mode}: l'accent ${accent} reste accessible`, () => {
      const { tokens } = deriveStorefrontTokens(kit, { accent, mode, allowVisitorModeToggle: true });
      assert.ok(contrastRatio(tokens.accent, tokens.background) >= 3);
      assert.ok(contrastRatio(tokens.accentText, tokens.accent) >= 4.5);
      assert.ok(contrastRatio(tokens.text, tokens.background) >= 4.5);
    });
  }
}

test("un accent invisible est adapté et signalé", () => {
  const result = deriveStorefrontTokens(kit, { accent: "#ffffff", mode: "light", allowVisitorModeToggle: false });
  assert.notEqual(result.tokens.accent, "#ffffff");
  assert.deepEqual(result.warnings, ["accent_contrast_adjusted"]);
});
