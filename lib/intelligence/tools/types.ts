import type { z } from "zod";
import type { AgentContext, AgentPermissions } from "../types";

// null = outil en lecture seule, toujours exposé. Sinon, le nom d'un flag de
// voice_agent_config : l'outil n'est exposé au modèle que si ce flag est actif
// pour le tenant. C'est la seule porte d'entrée pour une action côté FLUX —
// un outil désactivé n'existe tout simplement pas dans la liste envoyée au
// modèle, il ne s'agit jamais d'une consigne que le modèle pourrait choisir
// d'ignorer.
export type ToolPermissionKey = keyof AgentPermissions | null;

export type ToolDefinition<Schema extends z.ZodTypeAny = z.ZodTypeAny> = {
  name: string;
  description: string;
  schema: Schema;
  permission: ToolPermissionKey;
  execute: (ctx: AgentContext, input: z.infer<Schema>) => Promise<unknown>;
};

export function defineTool<Schema extends z.ZodTypeAny>(
  def: ToolDefinition<Schema>
): ToolDefinition<Schema> {
  return def;
}
