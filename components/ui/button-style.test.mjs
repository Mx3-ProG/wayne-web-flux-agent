import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("shared primary and secondary FLUX buttons both use the smooth interaction", async () => {
  const source = await readFile(new URL("./button.tsx", import.meta.url), "utf8");
  assert.match(source, /default:\s*"flux-button-smooth/);
  assert.match(source, /secondary:\s*\n?\s*"flux-button-smooth flux-button-smooth-secondary/);
});

test("marketing footer and dashboard CTAs cannot bypass Smooth FLUX", async () => {
  const footer = await readFile(new URL("../marketing-footer.tsx", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../../app/(app)/espace/page.tsx", import.meta.url), "utf8");
  assert.match(footer, /flux-button-smooth[^\n]+styles\.cta/);
  assert.match(dashboard, /flux-button-smooth[^\n]+styles\.heroAction/);
  assert.match(dashboard, /flux-button-smooth[^\n]+styles\.storefrontPrimary/);
  assert.match(dashboard, /flux-button-smooth-secondary[^\n]+styles\.storefrontSecondary/);
});

test("public storefront components do not receive the internal FLUX class", async () => {
  for (const file of ["vitrine-view.tsx", "vitrine-header.tsx", "vitrine-subpage.tsx"]) {
    const source = await readFile(new URL(`../vitrine/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /flux-button-smooth/);
  }
});

test("credit pack actions use the gold Smooth FLUX accent", async () => {
  const packs = await readFile(new URL("../../app/(app)/credits/credit-packs.tsx", import.meta.url), "utf8");
  const globals = await readFile(new URL("../../app/globals.css", import.meta.url), "utf8");
  assert.match(packs, /flux-button-smooth flux-button-smooth-gold/);
  assert.match(globals, /\.flux-button-smooth-gold\s*\{[^}]*--flux-button-accent:\s*#d8a73b/s);
});
