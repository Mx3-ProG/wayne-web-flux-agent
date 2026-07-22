import type { PageAppearance } from "@/lib/types";
import type { DesignKit, StorefrontTokens } from "./types";

type RGB = { r: number; g: number; b: number };

export function normalizeHex(value: string | null | undefined, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(value ?? "") ? value!.toLowerCase() : fallback;
}

function rgb(hex: string): RGB {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: value >> 16, g: (value >> 8) & 255, b: value & 255 };
}

function hex({ r, g, b }: RGB): string {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(a: string, b: string): number {
  const luminance = (value: string) => {
    const color = rgb(value);
    return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function mix(a: string, b: string, amount: number): string {
  const first = rgb(a);
  const second = rgb(b);
  return hex({
    r: first.r + (second.r - first.r) * amount,
    g: first.g + (second.g - first.g) * amount,
    b: first.b + (second.b - first.b) * amount,
  });
}

function visibleAccent(accent: string, background: string): { color: string; adapted: boolean } {
  if (contrastRatio(accent, background) >= 3) return { color: accent, adapted: false };
  const target = contrastRatio("#000000", background) > contrastRatio("#ffffff", background)
    ? "#000000"
    : "#ffffff";
  for (let amount = 0.08; amount <= 0.72; amount += 0.04) {
    const candidate = mix(accent, target, amount);
    if (contrastRatio(candidate, background) >= 3) return { color: candidate, adapted: true };
  }
  return { color: target, adapted: true };
}

export function deriveStorefrontTokens(
  kit: DesignKit,
  appearance: PageAppearance
): { tokens: StorefrontTokens; warnings: string[] } {
  const dark = appearance.mode === "dark";
  const background = dark
    ? normalizeHex(kit.defaults.colors.dark, "#0b0b0d")
    : normalizeHex(kit.defaults.colors.background, "#f7f5f1");
  const surface = dark
    ? mix(background, "#ffffff", 0.07)
    : normalizeHex(kit.defaults.colors.card, mix(background, "#000000", 0.035));
  const elevated = dark ? mix(surface, "#ffffff", 0.055) : mix(surface, "#ffffff", 0.68);
  const text = dark ? "#f8f6f2" : "#171617";
  const mutedCandidate = dark ? mix(text, background, 0.4) : mix(text, background, 0.46);
  const muted = contrastRatio(mutedCandidate, background) >= 4.5
    ? mutedCandidate
    : (dark ? "#b8b4b0" : "#625f60");
  const requestedAccent = normalizeHex(appearance.accent, kit.defaults.colors.primary);
  const resolvedAccent = visibleAccent(requestedAccent, background);
  const accentText = contrastRatio("#ffffff", resolvedAccent.color) >= 4.5 ? "#ffffff" : "#080808";
  const warnings = resolvedAccent.adapted ? ["accent_contrast_adjusted"] : [];

  return {
    warnings,
    tokens: {
      background,
      surface,
      elevated,
      text,
      muted,
      line: dark ? mix(text, background, 0.84) : mix(text, background, 0.86),
      accent: resolvedAccent.color,
      accentText,
      hero: dark ? background : normalizeHex(kit.defaults.colors.dark, "#111113"),
      navigation: dark ? mix(background, "#000000", 0.18) : mix(background, "#ffffff", 0.58),
      footer: dark ? mix(background, "#000000", 0.22) : mix(background, "#000000", 0.9),
    },
  };
}
