import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Garde de régression du prompt FLUX. buildPrompt (lib/claude.ts) a été
// refactorisé pour déléguer le bloc de contexte métier à businessContext
// (lib/flux/persona.ts). Ces deux fichiers doivent, ensemble, continuer à
// produire EXACTEMENT le même prompt que la version inline d'origine — sinon
// /api/generate régresse (et le cache implicite d'Anthropic saute). Ce test
// épingle les fragments porteurs.

test("buildPrompt délègue le contexte métier à businessContext", async () => {
  const claude = await readFile(new URL("../claude.ts", import.meta.url), "utf8");
  assert.match(claude, /businessContext\(\{ page, services, voice \}\)/);
  // Le rôle et les règles restent dans buildPrompt (hors businessContext).
  assert.match(
    claude,
    /Tu écris des contenus marketing en français pour un commerçant indépendant\. Tu écris À SA PLACE, en son nom \(première personne\)\./
  );
  assert.match(
    claude,
    /Règles : concret, direct, zéro jargon marketing/
  );
  assert.match(claude, /Consigne de l'outil : \$\{tool\.systemHint\}/);
});

test("businessContext épingle les fragments de contexte, vitrine et voix", async () => {
  const persona = await readFile(new URL("./persona.ts", import.meta.url), "utf8");
  // Contexte métier
  assert.match(persona, /Contexte métier : \$\{vertical\.promptContext\}/);
  // Vitrine
  assert.match(persona, /Le commerce : « \$\{page\.business_name\} »/);
  assert.match(persona, /Ses prestations : \$\{services/);
  assert.match(
    persona,
    /Le lien de réservation à mentionner quand c'est pertinent :/
  );
  // Voix
  assert.match(persona, /n'utilise JAMAIS d'emojis/);
  assert.match(persona, /Sa voix : \$\{voiceParts\.join\(" ; "\)\}\./);
  assert.match(persona, /Ses valeurs : \$\{voice\.vals\}/);
});
