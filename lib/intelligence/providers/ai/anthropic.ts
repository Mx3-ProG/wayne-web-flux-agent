import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/lib/claude";
import { toolsForContext } from "../../permissions";
import { renderSystemPrompt } from "../../context/build-agent-context";
import type { AgentContext } from "../../types";
import type { ToolDefinition } from "../../tools/types";

// Modèle dédié aux tours de conversation Voice : peu de tokens de sortie
// (réponses orales courtes), latence prioritaire sur la créativité.
const VOICE_MODEL = "claude-sonnet-5";
const MAX_TOOL_ROUNDS = 4;

export type ConversationMessage = { role: "user" | "assistant"; content: string };

export type ToolCallLog = { name: string; input: unknown; output: unknown };

export type AgentTurnResult = {
  reply: string;
  toolCalls: ToolCallLog[];
};

function toAnthropicTool(tool: ToolDefinition): Anthropic.Messages.Tool {
  // z.toJSONSchema() ajoute un champ $schema (méta-info) que l'API Anthropic
  // n'attend pas dans input_schema : on ne garde que le schéma lui-même.
  const { $schema: _drop, ...jsonSchema } = z.toJSONSchema(tool.schema) as Record<string, unknown> & {
    $schema?: string;
  };
  return {
    name: tool.name,
    description: tool.description,
    input_schema: jsonSchema as Anthropic.Messages.Tool.InputSchema,
  };
}

// Un tour de conversation complet : envoie l'historique + les tools autorisés
// pour ce tenant, exécute les tools demandés côté serveur (jamais côté
// modèle), et boucle jusqu'à une réponse texte finale ou une limite de tours
// (garde-fou contre une boucle d'appels d'outils qui ne convergerait pas).
export async function runAgentTurn(
  ctx: AgentContext,
  history: ConversationMessage[]
): Promise<AgentTurnResult> {
  const tools = toolsForContext(ctx);
  const toolByName = new Map(tools.map((t) => [t.name, t]));
  const anthropicTools = tools.map(toAnthropicTool);
  const system = renderSystemPrompt(ctx);

  const messages: Anthropic.Messages.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const toolCalls: ToolCallLog[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: VOICE_MODEL,
      max_tokens: 1024,
      system,
      tools: anthropicTools,
      messages,
    });

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
    );
    if (toolUseBlocks.length === 0) {
      const text = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { reply: text, toolCalls };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const tool = toolByName.get(block.name);
      let output: unknown;
      if (!tool) {
        output = { error: "tool_not_available" };
      } else {
        const parsed = tool.schema.safeParse(block.input);
        if (!parsed.success) {
          output = { error: "invalid_arguments" };
        } else {
          try {
            output = await tool.execute(ctx, parsed.data);
          } catch (e) {
            console.error("voice: tool execution failed", { tool: tool.name, pageId: ctx.pageId, error: e });
            output = { error: "tool_execution_failed" };
          }
        }
      }
      toolCalls.push({ name: block.name, input: block.input, output });
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(output),
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return {
    reply: "Je vous mets en relation avec un membre de l'équipe pour la suite.",
    toolCalls,
  };
}
