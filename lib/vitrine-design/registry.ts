import { DESIGN_COMPONENTS } from "./components/catalog";
import { DESIGN_KITS } from "./kits/catalog";
import { VOICE_ARCHETYPES } from "./voices/catalog";
import type { DesignEntry, DesignKit, DesignSlot, VoiceArchetype } from "./types";

export { DESIGN_COMPONENTS, DESIGN_KITS, VOICE_ARCHETYPES };
export type { DesignEntry, DesignKit, DesignSlot, VoiceArchetype };

export const DESIGN_COMPONENT_BY_ID = new Map(DESIGN_COMPONENTS.map((entry) => [entry.id, entry]));
export const DESIGN_KIT_BY_ID = new Map(DESIGN_KITS.map((entry) => [entry.id, entry]));
export const VOICE_ARCHETYPE_BY_ID = new Map(VOICE_ARCHETYPES.map((entry) => [entry.id, entry]));

export function validateDesignRegistry(): string[] {
  const errors: string[] = [];
  const duplicateIds = (ids: string[], label: string) => {
    if (new Set(ids).size !== ids.length) errors.push(`Identifiant ${label} dupliqué.`);
  };
  duplicateIds(DESIGN_COMPONENTS.map((entry) => entry.id), "composant");
  duplicateIds(DESIGN_KITS.map((entry) => entry.id), "kit");
  duplicateIds(VOICE_ARCHETYPES.map((entry) => entry.id), "voix");
  for (const kit of DESIGN_KITS) {
    for (const [slot, id] of Object.entries(kit.components)) {
      const entry = DESIGN_COMPONENT_BY_ID.get(id);
      if (!entry || entry.slot !== slot) errors.push(`${kit.id}: composant ${slot}/${id} invalide.`);
    }
    if (!VOICE_ARCHETYPE_BY_ID.has(kit.voiceArchetypeId)) errors.push(`${kit.id}: voix inconnue.`);
  }
  return errors;
}

const registryErrors = validateDesignRegistry();
if (registryErrors.length > 0) throw new Error(`Registre de design invalide: ${registryErrors.join(" ")}`);

export function componentsForSlot(slot: DesignSlot, kitId?: string): DesignEntry[] {
  const kit = kitId ? DESIGN_KIT_BY_ID.get(kitId) : undefined;
  return DESIGN_COMPONENTS.filter(
    (entry) => entry.slot === slot && (!kit || kit.compatibleComponents[slot].includes(entry.id))
  );
}

export function registryContext(): string {
  const kits = DESIGN_KITS.map((kit) => `${kit.id}: ${kit.description} [${kit.tags.join(", ")}]`).join("\n");
  const voices = VOICE_ARCHETYPES.map((voice) => `${voice.id}: ${voice.description} Instruction: ${voice.prompt}`).join("\n");
  return `Kits de design autorisés:\n${kits}\nVoix éditoriales autorisées:\n${voices}`;
}
