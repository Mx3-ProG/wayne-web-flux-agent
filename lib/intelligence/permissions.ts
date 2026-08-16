import { TOOL_REGISTRY } from "./tools/registry";
import type { ToolDefinition } from "./tools/types";
import type { AgentContext } from "./types";

// Porte d'entrée unique de la sécurité des tools : un outil désactivé pour ce
// tenant (voice_agent_config.allow_*) n'apparaît même pas dans la liste
// envoyée au modèle. Ce n'est jamais laissé à l'appréciation de l'IA — si
// `allow_cancellation` est faux, `cancel_appointment` n'existe pas pour cet
// appel, point.
export function toolsForContext(ctx: AgentContext): ToolDefinition[] {
  return TOOL_REGISTRY.filter((tool) => tool.permission === null || ctx.permissions[tool.permission]);
}
