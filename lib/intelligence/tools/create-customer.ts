import { z } from "zod";
import { defineTool } from "./types";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceKarlMada } from "@/lib/karlmada";

const PHONE_RE = /^[+0-9 ().-]{6,20}$/;

// Enregistre un prospect sans prise de rendez-vous (ex. demande d'infos). La
// création de fiche liée à une réservation passe par create_appointment, qui
// fait déjà cet upsert — ce tool couvre le cas où l'agent veut garder une
// trace du contact sans réserver.
export const createCustomerTool = defineTool({
  name: "create_customer",
  description: "Crée ou met à jour la fiche d'un client (prénom, téléphone, email), sans réserver de créneau.",
  schema: z.object({
    firstName: z.string().min(1).max(60),
    phone: z.string(),
    email: z.string().email().optional(),
  }),
  permission: "allowCustomerCreation",
  execute: async (ctx, input) => {
    if (!PHONE_RE.test(input.phone)) return { ok: false, error: "invalid_phone" };

    const moderation = await enforceKarlMada(
      { firstName: input.firstName },
      { surface: "voice:customer-input", pageId: ctx.pageId }
    );
    if (moderation.error) return { ok: false, error: "content_blocked" };

    const supabase = createAdminClient();
    const { error } = await supabase.from("customers").upsert(
      { page_id: ctx.pageId, phone: input.phone, first_name: input.firstName, email: input.email ?? null },
      { onConflict: "page_id,phone" }
    );
    return error ? { ok: false, error: "insert_failed" } : { ok: true };
  },
});
