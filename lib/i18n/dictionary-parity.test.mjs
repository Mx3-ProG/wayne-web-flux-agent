import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Garde-fou i18n : le français (lib/i18n/dictionaries/fr) est la source de
// vérité. Pour chaque namespace, chaque locale doit avoir exactement les
// mêmes clés (récursivement) et les mêmes placeholders {xxx} dans les
// valeurs traduites — sinon une régénération partielle passe inaperçue
// jusqu'à ce qu'un utilisateur tombe sur une clé manquante en prod.

const directory = dirname(fileURLToPath(import.meta.url));
const dictDir = resolve(directory, "dictionaries");
const FR = "fr";

const locales = readdirSync(dictDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const namespaces = readdirSync(resolve(dictDir, FR))
  .filter((name) => name.endsWith(".json"))
  .map((name) => name.replace(/\.json$/, ""))
  .sort();

function loadJson(locale, namespace) {
  const path = resolve(dictDir, locale, `${namespace}.json`);
  return JSON.parse(readFileSync(path, "utf8"));
}

// Toutes les clés, en notation pointée, jusqu'aux feuilles (valeurs non-objet).
function collectKeyPaths(value, prefix = "") {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) =>
      collectKeyPaths(child, prefix ? `${prefix}.${key}` : key)
    );
  }
  return [prefix];
}

// {placeholder} tokens présents dans une valeur (chaîne ou tableau de chaînes).
function collectPlaceholders(value) {
  const text = Array.isArray(value) ? value.join(" ") : String(value ?? "");
  return [...text.matchAll(/\{[a-zA-Z0-9_]+\}/g)].map((m) => m[0]).sort();
}

function valueAtPath(root, path) {
  return path.split(".").reduce((node, key) => (node == null ? undefined : node[key]), root);
}

test("every locale directory has the same dictionary namespaces as fr", () => {
  for (const locale of locales) {
    if (locale === FR) continue;
    const localeFiles = new Set(
      readdirSync(resolve(dictDir, locale))
        .filter((name) => name.endsWith(".json"))
        .map((name) => name.replace(/\.json$/, ""))
    );
    const missing = namespaces.filter((ns) => !localeFiles.has(ns));
    assert.deepEqual(missing, [], `${locale} is missing namespace file(s): ${missing.join(", ")}`);
  }
});

for (const namespace of namespaces) {
  const frDict = loadJson(FR, namespace);
  const frKeyPaths = collectKeyPaths(frDict).sort();

  for (const locale of locales) {
    if (locale === FR) continue;

    test(`dictionary parity: ${namespace} — ${locale} has the exact same keys as fr`, () => {
      const dict = loadJson(locale, namespace);
      const keyPaths = collectKeyPaths(dict).sort();

      const missing = frKeyPaths.filter((p) => !keyPaths.includes(p));
      const extra = keyPaths.filter((p) => !frKeyPaths.includes(p));

      assert.deepEqual(missing, [], `${locale}/${namespace}.json is missing keys: ${missing.join(", ")}`);
      assert.deepEqual(extra, [], `${locale}/${namespace}.json has extra keys not in fr: ${extra.join(", ")}`);
    });

    test(`placeholder parity: ${namespace} — ${locale} preserves every {placeholder} from fr`, () => {
      const dict = loadJson(locale, namespace);
      const mismatches = [];
      for (const path of frKeyPaths) {
        const frValue = valueAtPath(frDict, path);
        const localeValue = valueAtPath(dict, path);
        if (localeValue === undefined) continue; // déjà signalé par le test de parité des clés
        const frPlaceholders = collectPlaceholders(frValue);
        if (frPlaceholders.length === 0) continue;
        const localePlaceholders = collectPlaceholders(localeValue);
        if (
          frPlaceholders.length !== localePlaceholders.length ||
          frPlaceholders.some((p, i) => p !== localePlaceholders[i])
        ) {
          mismatches.push(`${path}: fr has [${frPlaceholders}], ${locale} has [${localePlaceholders}]`);
        }
      }
      assert.deepEqual(mismatches, [], mismatches.join("\n"));
    });
  }
}
