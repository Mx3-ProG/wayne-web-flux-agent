/**
 * Traduit les dictionnaires i18n depuis le français (source de vérité) vers
 * une langue cible, via l'API Anthropic. À utiliser pour ajouter une langue
 * ou régénérer un namespace après modification du français, puis RELIRE
 * avant de merger.
 *
 * Usage :
 *   ANTHROPIC_API_KEY=... npx tsx scripts/translate-dictionaries.ts <locale> [namespace]
 *   ex. npx tsx scripts/translate-dictionaries.ts ru landing
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English (US)",
  es: "Spanish (Spain)",
  de: "German",
  it: "Italian",
  ru: "Russian",
  zh: "Simplified Chinese",
  ja: "Japanese",
  ar: "Modern Standard Arabic",
};

// Langues écrites de droite à gauche : le prompt le rappelle explicitement,
// sinon le modèle traduit parfois en gardant une ponctuation/numérotation LTR.
const RTL_LOCALES = new Set(["ar"]);

const DICT_DIR = join(process.cwd(), "lib/i18n/dictionaries");

async function main() {
  const [locale, onlyNamespace] = process.argv.slice(2);
  if (!locale || !LANGUAGE_NAMES[locale]) {
    console.error(`Usage: translate-dictionaries.ts <${Object.keys(LANGUAGE_NAMES).join("|")}> [namespace]`);
    process.exit(1);
  }

  const client = new Anthropic();
  const frDir = join(DICT_DIR, "fr");
  const outDir = join(DICT_DIR, locale);
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(frDir).filter(
    (f) => f.endsWith(".json") && (!onlyNamespace || f === `${onlyNamespace}.json`)
  );

  for (const file of files) {
    const source = readFileSync(join(frDir, file), "utf8");
    console.log(`→ ${file} → ${locale}`);

    const message = await client.messages.create({
      model: "claude-sonnet-5",
      // 16000 truncated mid-JSON on larger namespaces (editor.json) once
      // CJK/Cyrillic output inflated token count past the source's own size.
      // Must stay <128000/6 (~21333) or the SDK refuses non-streaming calls.
      max_tokens: 21000,
      system: [
        `You translate the UI copy of Wayne Web Flux, a SaaS that builds websites for local businesses.`,
        `Translate the JSON values from French to ${LANGUAGE_NAMES[locale]}.`,
        `Rules: keep the exact JSON structure and keys; keep the informal, energetic brand voice;`,
        `never translate brand names (FLUX, Wayne Web, KarlMada, Stripe, Maison Veyra);`,
        `keep placeholders, emoji and punctuation style natural for the target language;`,
        `answer with the JSON only, no markdown fences.`,
        ...(RTL_LOCALES.has(locale)
          ? [
              `This is a right-to-left language: write natural RTL prose; keep {placeholder} tokens`,
              `and any embedded Latin brand names as literal left-to-right runs inside the RTL text.`,
            ]
          : []),
      ].join(" "),
      messages: [{ role: "user", content: source }],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Le modèle ignore parfois la consigne "no markdown fences" : on les
    // retire avant de parser plutôt que d'échouer toute la génération.
    const unfenced = text
      .trim()
      .replace(/^```(?:json)?\s*/, "")
      .replace(/```\s*$/, "");

    // Valide que la sortie est bien du JSON avant d'écrire.
    const parsed = JSON.parse(unfenced);
    writeFileSync(join(outDir, file), `${JSON.stringify(parsed, null, 2)}\n`);
    console.log(`  ✓ ${join("lib/i18n/dictionaries", locale, file)}`);
  }

  console.log("\nTerminé. Relis les fichiers avant de commit (npm run build vérifie les clés).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
