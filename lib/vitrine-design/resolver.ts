import type { Page, PageAppearance, PageDraftFields, PageTheme } from "@/lib/types";
import { DESIGN_COMPONENT_BY_ID, DESIGN_KIT_BY_ID, DESIGN_KITS, VOICE_ARCHETYPE_BY_ID } from "./registry";
import { DESIGN_SLOTS, type ResolvedStorefrontPresentation, type ResolvedVitrineDesign, type VitrineDesignConfig } from "./types";
import { deriveStorefrontTokens, normalizeHex } from "./palette";

const DARK_THEMES: PageTheme[] = ["studio", "luxe", "neon", "prestige", "performance-gt", "rosso-editorial"];

export function appearanceConfigError(config: PageAppearance): string | null {
  if (!/^#[0-9a-f]{6}$/i.test(config.accent)) return "invalid_appearance_accent";
  if (config.mode !== "light" && config.mode !== "dark") return "invalid_appearance_mode";
  if (typeof config.allowVisitorModeToggle !== "boolean") return "invalid_appearance_toggle";
  return null;
}

// Retourne un CODE d'erreur stable (traduit à la frontière d'affichage via
// editor.actionErrors), ou null si valide.
export function designConfigError(config: VitrineDesignConfig): string | null {
  const kit = DESIGN_KIT_BY_ID.get(config.kitId);
  if (!kit) return "unknown_design_kit";
  for (const [slot, id] of Object.entries(config.components ?? {})) {
    if (!DESIGN_SLOTS.includes(slot as (typeof DESIGN_SLOTS)[number])) return "unknown_design_category";
    const entry = DESIGN_COMPONENT_BY_ID.get(id);
    if (!entry || entry.slot !== slot) return "invalid_design_component";
    if (!kit.compatibleComponents[slot as keyof typeof kit.compatibleComponents]?.includes(id)) return "incompatible_design_component";
  }
  if (config.voiceArchetypeId && !VOICE_ARCHETYPE_BY_ID.has(config.voiceArchetypeId)) return "unknown_voice_archetype";
  return null;
}

export function resolveVitrineDesign(theme: PageTheme, config?: VitrineDesignConfig | null): ResolvedVitrineDesign {
  const fallback = DESIGN_KIT_BY_ID.get(theme) ?? DESIGN_KITS[0];
  const kit = (config && DESIGN_KIT_BY_ID.get(config.kitId)) || fallback;
  const components = Object.fromEntries(DESIGN_SLOTS.map((slot) => {
    const requested = config?.components?.[slot];
    const id = requested && kit.compatibleComponents[slot].includes(requested)
      ? requested
      : kit.components[slot];
    return [slot, DESIGN_COMPONENT_BY_ID.get(id)!];
  })) as ResolvedVitrineDesign["components"];
  const voice = VOICE_ARCHETYPE_BY_ID.get(config?.voiceArchetypeId ?? kit.voiceArchetypeId)
    ?? VOICE_ARCHETYPE_BY_ID.get(kit.voiceArchetypeId)!;
  return { kit, components, voice };
}

export function legacyAppearance(
  page: Pick<Page, "theme" | "colors" | "appearance">
): PageAppearance {
  return page.appearance ?? {
    accent: normalizeHex(page.colors?.primary, DESIGN_KIT_BY_ID.get(page.theme)?.defaults.colors.primary ?? "#d31212"),
    mode: DARK_THEMES.includes(page.theme) ? "dark" : "light",
    allowVisitorModeToggle: true,
  };
}

export function resolveStorefrontPresentation(
  page: Pick<Page, "theme" | "colors" | "appearance" | "design">
): ResolvedStorefrontPresentation {
  const design = resolveVitrineDesign(page.theme || "editorial", page.design);
  const appearance = legacyAppearance(page);
  const palette = deriveStorefrontTokens(design.kit, appearance);
  return {
    ...design,
    version: 2,
    appearance,
    tokens: palette.tokens,
    warnings: palette.warnings,
    sectionRecipes: design.kit.sectionRecipes,
  };
}

// Sélectionner un univers applique un preset visuel complet. Le contenu métier
// reste intact et les overrides du kit précédent sont volontairement retirés.
export function designKitPatch(
  kitId: string,
  current?: Pick<Page, "theme" | "appearance">
): Partial<PageDraftFields> {
  const kit = DESIGN_KIT_BY_ID.get(kitId) ?? DESIGN_KIT_BY_ID.get(current?.theme ?? "editorial") ?? DESIGN_KITS[0];
  return {
    theme: kit.legacyTheme,
    design: { kitId: kit.id },
    colors: { ...kit.defaults.colors },
    appearance: {
      accent: kit.defaults.colors.primary,
      mode: DARK_THEMES.includes(kit.legacyTheme) ? "dark" : "light",
      allowVisitorModeToggle: current?.appearance
        ? current.appearance.allowVisitorModeToggle
        : true,
    },
    font: kit.defaults.font,
    typography: { ...kit.defaults.typography },
  };
}
