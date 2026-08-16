import { z } from "zod";
import { defineTool } from "./types";
import { createAdminClient } from "@/lib/supabase/admin";

// Lecture seule, toujours exposée : reconnaître un appelant existant (ex.
// "Bonjour Monsieur Martin") ne crée ni ne modifie rien. Recherche exacte par
// téléphone et scopée page_id — jamais de parcours libre du CRM.
export const findCustomerTool = defineTool({
  name: "find_customer",
  description: "Recherche un client existant de cette entreprise par numéro de téléphone.",
  schema: z.object({ phone: z.string() }),
  permission: null,
  execute: async (ctx, input) => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("customers")
      .select("id, first_name, email")
      .eq("page_id", ctx.pageId)
      .eq("phone", input.phone)
      .maybeSingle();
    return data ?? { found: false };
  },
});
