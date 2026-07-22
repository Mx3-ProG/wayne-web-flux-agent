// Module de logique pure (aucun secret, aucun accès DB) → pas de "server-only",
// afin de rester testable en isolation.
//
// Réparation « best effort » de la sortie du modèle AVANT revalidation Zod.
// Objectif : ne jamais jeter (et donc ne jamais rembourser) une génération
// presque valide. On coerce ce qui est trivialement réparable — couleurs hex
// approximatives, textes trop longs, listes trop nombreuses — pour que
// safeParse passe et que le site soit livré. Ce qui reste structurellement
// inexploitable après réparation (sortie vide / non-objet) échoue franchement :
// c'est le seul cas où le remboursement est légitime.

const HEX6 = /^#[0-9a-fA-F]{6}$/;

// #f0a / f0a / #FF00AA / ff00aa → #ff00aa. Renvoie le fallback si irréparable.
export function normalizeHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  let v = value.trim().toLowerCase();
  if (!v.startsWith("#")) v = `#${v}`;
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  if (short) v = `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  return HEX6.test(v) ? v : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function clampText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

type RepairedSection =
  | { type: "texte"; title: string; body: string }
  | { type: "a_propos"; title: string; body: string }
  | { type: "faq"; title?: string; items: Array<{ question: string; answer: string }> };

function repairSection(raw: unknown): RepairedSection | null {
  const node = asRecord(raw);
  const type = node.type;
  if (type === "texte" || type === "a_propos") {
    const title = clampText(node.title, 120);
    const body = clampText(node.body, 2000);
    if (!title && !body) return null;
    return { type, title, body };
  }
  if (type === "faq") {
    const items = Array.isArray(node.items)
      ? node.items
          .map((item) => {
            const it = asRecord(item);
            return { question: clampText(it.question, 200), answer: clampText(it.answer, 1000) };
          })
          .filter((it) => it.question && it.answer)
          .slice(0, 10)
      : [];
    if (items.length === 0) return null;
    const title = clampText(node.title, 120);
    return title ? { type, title, items } : { type, items };
  }
  return null;
}

function repairFaqItems(raw: unknown, max: number) {
  return (Array.isArray(raw) ? raw : [])
    .map((item) => {
      const it = asRecord(item);
      return { question: clampText(it.question, 200), answer: clampText(it.answer, 1000) };
    })
    .filter((it) => it.question && it.answer)
    .slice(0, max);
}

// Génération complète (fluxGenerateSite). fallbackColors = couleurs actuelles de
// la page, utilisées quand le modèle renvoie une couleur irréparable.
export function repairFluxSiteOutput(
  raw: unknown,
  fallbackColors: { primary: string; dark: string }
): unknown {
  const node = asRecord(raw);
  const seo = asRecord(node.seo);
  const colors = asRecord(node.colors);
  const sections = (Array.isArray(node.sections) ? node.sections : [])
    .map(repairSection)
    .filter((s): s is RepairedSection => s !== null)
    .slice(0, 5);

  return {
    ...node,
    tagline: clampText(node.tagline, 160),
    seo: { title: clampText(seo.title, 70), description: clampText(seo.description, 200) },
    colors: {
      primary: normalizeHex(colors.primary, fallbackColors.primary),
      dark: normalizeHex(colors.dark, fallbackColors.dark),
    },
    sections,
  };
}

// Pré-remplissage (fluxPrefill).
export function repairFluxPrefillOutput(raw: unknown): unknown {
  const node = asRecord(raw);
  const seo = asRecord(node.seo);
  const about = asRecord(node.about);

  return {
    ...node,
    tagline: clampText(node.tagline, 160),
    seo: { title: clampText(seo.title, 70), description: clampText(seo.description, 200) },
    about: { title: clampText(about.title, 120), body: clampText(about.body, 2000) },
    faq: repairFaqItems(node.faq, 8),
  };
}
