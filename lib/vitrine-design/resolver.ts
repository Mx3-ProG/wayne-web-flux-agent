import type { Page, PageDraftFields, PageTheme } from "@/lib/types";
import { DESIGN_COMPONENT_BY_ID, DESIGN_KIT_BY_ID, DESIGN_KITS, VOICE_ARCHETYPE_BY_ID } from "./registry";
import { DESIGN_SLOTS, type ResolvedVitrineDesign, type VitrineDesignConfig } from "./types";

export function designConfigError(config: VitrineDesignConfig): string | null {
  const kit = DESIGN_KIT_BY_ID.get(config.kitId);
  if (!kit) return "Kit de design inconnu.";
  for (const [slot, id] of Object.entries(config.components ?? {})) {
    if (!DESIGN_SLOTS.includes(slot as (typeof DESIGN_SLOTS)[number])) return "Catégorie de design inconnue.";
    const entry = DESIGN_COMPONENT_BY_ID.get(id);
    if (!entry || entry.slot !== slot) return "Composant de design invalide.";
    if (entry.compatibleKits && !entry.compatibleKits.includes(kit.id)) return "Composant incompatible avec ce kit.";
  }
  if (config.voiceArchetypeId && !VOICE_ARCHETYPE_BY_ID.has(config.voiceArchetypeId)) return "Voix éditoriale inconnue.";
  return null;
}

export function resolveVitrineDesign(theme: PageTheme, config?: VitrineDesignConfig | null): ResolvedVitrineDesign {
  const fallback = DESIGN_KIT_BY_ID.get(theme) ?? DESIGN_KITS[0];
  const safeConfig = config && !designConfigError(config) ? config : null;
  const kit = (safeConfig && DESIGN_KIT_BY_ID.get(safeConfig.kitId)) || fallback;
  const components = Object.fromEntries(DESIGN_SLOTS.map((slot) => {
    const id = safeConfig?.components?.[slot] ?? kit.components[slot];
    return [slot, DESIGN_COMPONENT_BY_ID.get(id)!];
  })) as ResolvedVitrineDesign["components"];
  const voice = VOICE_ARCHETYPE_BY_ID.get(safeConfig?.voiceArchetypeId ?? kit.voiceArchetypeId)!;
  return { kit, components, voice };
}

// Sélectionner un univers applique un preset visuel complet. Le contenu métier
// reste intact et les overrides du kit précédent sont volontairement retirés.
export function designKitPatch(
  kitId: string,
  current?: Pick<Page, "theme">
): Partial<PageDraftFields> {
  const kit = DESIGN_KIT_BY_ID.get(kitId) ?? DESIGN_KIT_BY_ID.get(current?.theme ?? "editorial") ?? DESIGN_KITS[0];
  return {
    theme: kit.legacyTheme,
    design: { kitId: kit.id },
    colors: { ...kit.defaults.colors },
    font: kit.defaults.font,
    typography: { ...kit.defaults.typography },
  };
}
