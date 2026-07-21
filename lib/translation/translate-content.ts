import "server-only";
import { anthropic } from "@/lib/claude";
import { LOCALE_LABELS, type Locale } from "@/lib/i18n/config";

// Traduction des CONTENUS de boutique (localized_content), volontairement
// séparée de lib/claude.ts#buildPrompt (le générateur créatif de FLUX). Ce
// module ne fait QUE traduire un JSON existant, fidèlement, sans jamais
// inventer, résumer ou enrichir le contenu — l'inverse de FLUX. Ne jamais
// fusionner les deux : FLUX écrit à la place du commerçant, ceci se contente
// de porter ses propres mots dans une autre langue.

const RTL_LOCALES = new Set<Locale>(["ar"]);

export class TranslationValidationError extends Error {}

// Ne garde que les clés au même chemin dans les deux objets, en comparant le
// TYPE de chaque feuille (string doit rester string, number reste number,
// etc.) — une traduction ne doit jamais changer la forme des données.
function sameShape(a: unknown, b: unknown, path = "$"): string | null {
  if (a === null || a === undefined) return null; // champ optionnel absent : accepté
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return `${path}: expected array`;
    if (a.length !== b.length) return `${path}: array length changed (${a.length} → ${b.length})`;
    for (let i = 0; i < a.length; i++) {
      const err = sameShape(a[i], b[i], `${path}[${i}]`);
      if (err) return err;
    }
    return null;
  }
  if (typeof a === "object") {
    if (typeof b !== "object" || b === null || Array.isArray(b)) return `${path}: expected object`;
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    for (const key of Object.keys(ao)) {
      const err = sameShape(ao[key], bo[key], `${path}.${key}`);
      if (err) return err;
    }
    // Le traducteur ne doit ajouter aucune clé.
    for (const key of Object.keys(bo)) {
      if (!(key in ao)) return `${path}.${key}: unexpected extra key`;
    }
    return null;
  }
  if (typeof a !== typeof b) return `${path}: type changed (${typeof a} → ${typeof b})`;
  return null;
}

const MAX_INPUT_CHARS = 20000;

/**
 * Traduit fidèlement un objet JSON (les valeurs texte uniquement) du
 * français vers `locale`. Lève TranslationValidationError si la sortie ne
 * parse pas ou si sa forme (clés, types, longueur des tableaux) diverge de
 * l'entrée — jamais de contenu à moitié traduit accepté silencieusement.
 */
export async function translateContent<T>(source: T, locale: Locale): Promise<T> {
  const json = JSON.stringify(source);
  if (json.length > MAX_INPUT_CHARS) {
    throw new TranslationValidationError(`source too large (${json.length} chars > ${MAX_INPUT_CHARS})`);
  }
  if (json === "null" || json === "{}" || json === "[]") {
    return source;
  }

  const language = LOCALE_LABELS[locale];
  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 8000,
    system: [
      `You translate business content for a local business's website from French to ${language}.`,
      `You are a FAITHFUL TRANSLATOR, not a copywriter: preserve meaning, tone and length as closely as`,
      `natural in the target language. Never invent, summarize, embellish or drop information.`,
      `Rules: this is JSON. Translate ONLY human-readable string values (prose, labels, titles, names,`,
      `descriptions, questions, answers). NEVER translate or alter: object/array keys, ids, slugs, types,`,
      `enum-like short technical values, URLs, numbers, booleans, null, colors (hex codes), phone numbers,`,
      `emails, or empty strings. Keep the exact same JSON structure (same keys, same array lengths).`,
      `Keep any {placeholder} tokens and brand names (FLUX, Wayne Web) exactly as-is, unchanged.`,
      `Answer with the JSON only, no markdown fences, no commentary.`,
      ...(RTL_LOCALES.has(locale)
        ? [`This is a right-to-left language: write natural RTL prose while keeping the rules above.`]
        : []),
    ].join(" "),
    messages: [{ role: "user", content: json }],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim()
    .replace(/^```(?:json)?\s*/, "")
    .replace(/```\s*$/, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new TranslationValidationError("model output is not valid JSON");
  }

  const shapeError = sameShape(source, parsed);
  if (shapeError) {
    throw new TranslationValidationError(`shape mismatch: ${shapeError}`);
  }

  return parsed as T;
}
