import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeHex,
  repairFluxSiteOutput,
  repairFluxPrefillOutput,
} from "./repair.ts";

const FALLBACK = { accent: "#1a1a1a", mode: "light", allowVisitorModeToggle: true };

test("normalizeHex : accepte le format complet et le normalise en minuscules", () => {
  assert.equal(normalizeHex("#FF00AA", "#000000"), "#ff00aa");
  assert.equal(normalizeHex("  #Ab12Cd  ", "#000000"), "#ab12cd");
});

test("normalizeHex : ajoute le # et étend la forme courte #rgb", () => {
  assert.equal(normalizeHex("ff00aa", "#000000"), "#ff00aa");
  assert.equal(normalizeHex("#f0a", "#000000"), "#ff00aa");
  assert.equal(normalizeHex("f0a", "#000000"), "#ff00aa");
});

test("normalizeHex : renvoie le fallback pour l'irréparable", () => {
  assert.equal(normalizeHex("rgb(1,2,3)", "#123456"), "#123456");
  assert.equal(normalizeHex("bleu", "#123456"), "#123456");
  assert.equal(normalizeHex(null, "#123456"), "#123456");
  assert.equal(normalizeHex(42, "#123456"), "#123456");
});

test("repairFluxSiteOutput : coerce couleurs, tronque les textes, borne les sections", () => {
  const out = repairFluxSiteOutput(
    {
      tagline: "x".repeat(500),
      seo: { title: "t".repeat(200), description: "d".repeat(500) },
      appearance: { accent: "#f0a", mode: "dark", allowVisitorModeToggle: false },
      sections: [
        { type: "texte", title: "A", body: "corps" },
        { type: "a_propos", title: "B", body: "corps" },
        { type: "faq", items: [{ question: "Q1", answer: "R1" }] },
        { type: "texte", title: "C", body: "corps" },
        { type: "texte", title: "D", body: "corps" },
        { type: "texte", title: "E", body: "corps" },
      ],
    },
    FALLBACK
  );

  assert.equal(out.tagline.length, 160);
  assert.equal(out.seo.title.length, 70);
  assert.equal(out.seo.description.length, 200);
  assert.equal(out.appearance.accent, "#ff00aa");
  assert.equal(out.appearance.mode, "dark");
  assert.equal(out.appearance.allowVisitorModeToggle, false);
  assert.equal(out.sections.length, 5, "borné à 5 sections");
});

test("repairFluxSiteOutput : élimine les sections inexploitables", () => {
  const out = repairFluxSiteOutput(
    {
      appearance: { accent: "#111111", mode: "light", allowVisitorModeToggle: true },
      sections: [
        { type: "inconnu", title: "X", body: "y" },
        { type: "texte", title: "", body: "" },
        { type: "faq", items: [] },
        { type: "texte", title: "OK", body: "contenu" },
      ],
    },
    FALLBACK
  );
  assert.equal(out.sections.length, 1);
  assert.equal(out.sections[0].title, "OK");
});

test("repairFluxSiteOutput : entrée non-objet → structure vide (rejetée ensuite par Zod)", () => {
  const out = repairFluxSiteOutput(null, FALLBACK);
  assert.equal(out.sections.length, 0);
  assert.equal(out.appearance.accent, FALLBACK.accent);
});

test("repairFluxPrefillOutput : tronque et borne la FAQ à 8", () => {
  const faq = Array.from({ length: 12 }, (_, i) => ({ question: `Q${i}`, answer: `R${i}` }));
  const out = repairFluxPrefillOutput({
    tagline: "z".repeat(300),
    seo: { title: "t".repeat(100), description: "d" },
    about: { title: "à propos", body: "b".repeat(3000) },
    faq,
  });
  assert.equal(out.tagline.length, 160);
  assert.equal(out.seo.title.length, 70);
  assert.equal(out.about.body.length, 2000);
  assert.equal(out.faq.length, 8);
});
