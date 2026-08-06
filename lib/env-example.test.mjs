import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// .env.example fait foi sur les variables attendues (cf. .gitignore). Une
// variable lue par le code mais absente du gabarit finit par manquer en
// production, où elle tombe silencieusement sur son repli codé en dur — c'est
// ce qui est arrivé à CONTACT_EMAIL, dont l'absence redirigeait les messages du
// formulaire de contact vers une boîte qui n'est pas celle du client.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Fournies par le runtime, jamais par le déploiement.
const RUNTIME_PROVIDED = new Set(["NODE_ENV"]);

// Noms de variables construits dynamiquement (process.env[envName]) : ils sont
// couverts par lib/stripe-price-env.test.mjs, qui vérifie les deux jeux de noms
// acceptés côté code.
const DYNAMIC_LOOKUPS = new Set([
  "STRIPE_PRICE_BASIQUE",
  "STRIPE_PRICE_PRO",
  "STRIPE_PRICE_BUSINESS",
  "STRIPE_PRICE_ENTREPRISE",
  "STRIPE_PRICE_CREDITS_PACK50",
  "STRIPE_PRICE_CREDITS_PACK150",
  "STRIPE_PRICE_CREDITS_PACK400",
  "STRIPE_BASIQUE_FORFAIT",
  "STRIPE_PRO_FORFAIT",
  "STRIPE_BUSINESS_FORFAIT",
  "STRIPE_ENTREPRISE_FORFAIT",
  "STRIPE_50_CREDIT_FLUX",
  "STRIPE_150_CREDIT_FLUX",
  "STRIPE_400_CREDIT_FLUX",
]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.(ts|tsx|mjs)$/.test(entry) && !/\.test\.(ts|mjs)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function usedVariables() {
  const roots = ["app", "lib", "components", "scripts"].map((d) =>
    resolve(repoRoot, d)
  );
  const files = [...roots.flatMap((root) => walk(root)), resolve(repoRoot, "proxy.ts")];
  const used = new Set();
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      used.add(match[1]);
    }
  }
  return used;
}

function declaredVariables() {
  const source = readFileSync(resolve(repoRoot, ".env.example"), "utf8");
  return new Set(
    source
      .split("\n")
      .map((line) => line.match(/^([A-Z0-9_]+)=/)?.[1])
      .filter(Boolean)
  );
}

test("toute variable d'environnement lue par le code est déclarée dans .env.example", () => {
  const declared = declaredVariables();
  const missing = [...usedVariables()]
    .filter((name) => !RUNTIME_PROVIDED.has(name) && !declared.has(name))
    .sort();
  assert.deepEqual(missing, [], `variable(s) absente(s) de .env.example`);
});

test(".env.example ne déclare pas de variable morte", () => {
  const used = usedVariables();
  const unused = [...declaredVariables()]
    .filter((name) => !used.has(name) && !DYNAMIC_LOOKUPS.has(name))
    .sort();
  assert.deepEqual(unused, [], `variable(s) déclarée(s) mais jamais lue(s)`);
});
