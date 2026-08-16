import { z } from "zod";
import { defineTool } from "./types";

// Ne déclenche pas le transfert lui-même (c'est l'orchestrateur d'appel,
// lib/voice/call-session.ts en Phase 5, qui pilote la téléphonie) : ce tool ne
// fait que signaler l'intention et renvoyer le numéro de repli du tenant.
export const transferToHumanTool = defineTool({
  name: "transfer_to_human",
  description:
    "Transfère l'appel vers un membre de l'équipe. À utiliser si le client le demande explicitement, si tu ne peux pas répondre à sa demande, ou en cas de situation sensible.",
  schema: z.object({
    reason: z.string().max(200).optional().describe("motif bref du transfert"),
  }),
  permission: "allowTransferToHuman",
  execute: async (ctx, input) => {
    if (!ctx.fallbackPhoneNumber) return { ok: false, error: "no_fallback_number" };
    return { ok: true, transferTo: ctx.fallbackPhoneNumber, reason: input.reason ?? null };
  },
});
