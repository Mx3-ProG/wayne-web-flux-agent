import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Garde-fous ciblés pour l'espace authentifié (pop-up d'abonnement, bandeau
// d'essai, carte de CA, modales de crédits, checkout, voix) + un contrôle
// des chaînes françaises résiduelles dans les surfaces authentifiées. Les
// tests de parité génériques (dictionary-parity.test.mjs) couvrent déjà
// clés/placeholders pour TOUS les namespaces ; ici on vérifie que les
// dictionnaires disent bien ce que le code attend d'eux.

const directory = dirname(fileURLToPath(import.meta.url));
const dictDir = resolve(directory, "dictionaries");
const repoRoot = resolve(directory, "../..");
const LOCALES = ["fr", "en", "es", "de", "it", "ru", "zh", "ja", "ar"];

function dict(locale, namespace) {
  return JSON.parse(readFileSync(resolve(dictDir, locale, `${namespace}.json`), "utf8"));
}

test("upsell dialog: all 5 status variants have title+description in all 9 locales", () => {
  const variants = ["trial", "trialExpired", "trialExpiredWithCredits", "creditsActive", "creditsExpired"];
  for (const locale of LOCALES) {
    const d = dict(locale, "dashboard").upsellDialog;
    assert.ok(d.later && d.discoverPlans, `${locale}: missing shared upsellDialog buttons`);
    for (const variant of variants) {
      assert.ok(d[variant]?.title, `${locale}: upsellDialog.${variant}.title missing`);
      assert.ok(d[variant]?.description, `${locale}: upsellDialog.${variant}.description missing`);
    }
  }
});

test("trial banner: all branches (active/credits/expired) translated with day+credit placeholders", () => {
  for (const locale of LOCALES) {
    const d = dict(locale, "dashboard").trialBanner;
    assert.match(d.activeSingular, /\{days\}/);
    assert.match(d.activePlural, /\{days\}/);
    assert.match(d.creditsActiveSingular, /\{credits\}/);
    assert.match(d.creditsActivePlural, /\{credits\}/);
    assert.ok(d.expiredNoCredits && d.viewPlans && d.choosePlan);
  }
});

test("revenue counter card: fully translated with amount placeholders", () => {
  for (const locale of LOCALES) {
    const d = dict(locale, "dashboard").revenueCounter;
    assert.ok(d.aria && d.eyebrow && d.caption && d.maxed);
    assert.match(d.milestoneReached, /\{amount\}/);
    assert.match(d.nextMilestone, /\{amount\}/);
    assert.match(d.remaining, /\{amount\}/);
  }
});

test("credits checkout (billing.checkout): plan and credits pack copy translated in all locales", () => {
  for (const locale of LOCALES) {
    const d = dict(locale, "billing").checkout;
    assert.match(d.creditsFeatureCredits, /\{credits\}/);
    assert.match(d.creditsFeatureUnitPrice, /\{price\}/);
    assert.match(d.planFeatureMonthlyCredits, /\{credits\}/);
    assert.match(d.planFeatureProjectsSingular, /\{count\}/);
    assert.match(d.planFeatureProjectsPlural, /\{count\}/);
    assert.ok(d.metaTitleSubscription && d.metaTitleCredits);
  }
});

test("payment confirmation copy translated in all locales", () => {
  for (const locale of LOCALES) {
    const d = dict(locale, "billing").confirmation;
    assert.match(d.creditsAdding, /\{credits\}/);
    assert.match(d.planActivating, /\{plan\}/);
    assert.ok(d.confirmedTitle && d.processingTitle && d.failedTitle);
  }
});

test("voice steps: every option id from the invariant structure has translated content in all locales", async () => {
  const { STEP_OPTION_IDS, VOICE_STEP_KEYS, INVARIANT_VALUE_STEPS } = await import(
    "../../components/voice/voice-options.ts"
  );
  for (const locale of LOCALES) {
    const steps = dict(locale, "voice").steps;
    for (const key of VOICE_STEP_KEYS) {
      const stepDict = steps[key];
      assert.ok(stepDict?.kicker && stepDict?.title && stepDict?.subtitle, `${locale}: voice.steps.${key} missing kicker/title/subtitle`);
      for (const id of STEP_OPTION_IDS[key]) {
        const option = stepDict.options[id];
        assert.ok(option?.title && option?.text, `${locale}: voice.steps.${key}.options.${id} missing title/text`);
        if (INVARIANT_VALUE_STEPS.has(key)) {
          assert.equal(option.value, undefined, `${locale}: voice.steps.${key}.options.${id} should not carry a translated value (invariant step)`);
        } else {
          assert.ok(option.value, `${locale}: voice.steps.${key}.options.${id}.value missing (fed to FLUX)`);
        }
      }
    }
  }
});

test("arabic is the only RTL locale and carries full cookie-consent + checkout translations", () => {
  const arCommon = dict("ar", "common");
  assert.ok(arCommon.cookieConsent.title);
  const arBilling = dict("ar", "billing");
  assert.ok(arBilling.checkout.payButton && arBilling.confirmation.confirmedTitle);
});

// --- Contrôle des chaînes françaises résiduelles dans l'espace authentifié ---

const FRENCH_CHARS = /[éèêàùôçâîïûœÉÈÊÀÙÔÇÂÎÏÛŒ]/;

// Allowlist explicite : chemins où du français est attendu, avec la raison.
// Ne JAMAIS ignorer un fichier entier pour "quelques identifiants" isolés
// sans revue — chaque entrée ici doit être justifiée individuellement.
const ALLOWLIST = [
  // Prompts système envoyés à FLUX : instructions internes à l'IA, jamais
  // affichées à l'utilisateur. Le rôle et la langue de sortie de FLUX ne
  // changent pas (voir AGENTS.md) — seul le CONTENU généré suit la locale.
  { file: "app/(app)/ma-page/flux-actions.ts", reason: "system prompts sent to the FLUX AI model, never rendered to the user" },
  // Erreur interrompant un logout() défaillant : jamais lue par l'UI
  // (app/error.tsx ignore error.message et affiche un écran générique
  // traduit — voir components/error-screen.tsx).
  { file: "app/(app)/actions.ts", reason: "thrown Error message never surfaced — app/error.tsx renders a generic translated screen" },
];

function isAllowlisted(filePath) {
  return ALLOWLIST.some((entry) => filePath.endsWith(entry.file));
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

// Les arguments de console.* sont du diagnostic serveur destiné aux logs
// Vercel, jamais rendus à l'utilisateur : les traduire n'aurait aucun sens et
// rendrait le débogage en production plus difficile. On les retire avant le
// scan, plutôt que d'allowlister des fichiers entiers pour cette seule raison.
function stripConsoleCalls(source) {
  return source.replace(
    /console\.(log|info|warn|error|debug)\s*\(([^()]|\([^()]*\))*\)/g,
    ""
  );
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, files);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|mjs)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

test("no residual French strings in authenticated dashboard surfaces (outside allowlist)", () => {
  const scanRoots = [
    resolve(repoRoot, "app/(app)"),
    resolve(repoRoot, "app/checkout"),
  ];
  const sharedComponents = [
    "components/account-upsell-dialog.tsx",
    "components/trial-banner.tsx",
    "components/revenue-counter.tsx",
    "components/credits-link.tsx",
    "components/copy-button.tsx",
    "components/cookie-consent.tsx",
    "components/checkout/custom-checkout.tsx",
    "components/stats/stats-tunnel.tsx",
    "components/editor/photo-upload.tsx",
    "components/voice/voice-tunnel.tsx",
    "components/voice/voice-form.tsx",
    "components/voice/voice-options.ts",
  ].map((p) => resolve(repoRoot, p));

  const files = [...scanRoots.flatMap((root) => walk(root)), ...sharedComponents];
  const offenders = [];

  for (const file of files) {
    const relative = file.slice(repoRoot.length + 1);
    if (isAllowlisted(relative)) continue;
    const source = stripConsoleCalls(stripComments(readFileSync(file, "utf8")));
    const stringLiterals = [
      ...source.matchAll(/"([^"\\]|\\.)*"/g),
      ...source.matchAll(/'([^'\\]|\\.)*'/g),
      ...source.matchAll(/`([^`\\]|\\.)*`/g),
    ].map((m) => m[0]);
    for (const literal of stringLiterals) {
      if (FRENCH_CHARS.test(literal)) {
        offenders.push(`${relative}: ${literal.slice(0, 80)}`);
      }
    }
  }

  assert.deepEqual(offenders, [], `Residual French strings found:\n${offenders.join("\n")}`);
});
