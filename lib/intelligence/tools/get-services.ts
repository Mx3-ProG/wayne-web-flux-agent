import { z } from "zod";
import { defineTool } from "./types";

export const getServicesTool = defineTool({
  name: "get_services",
  description: "Liste les prestations proposées par l'entreprise, avec leur durée et leur prix.",
  schema: z.object({}),
  permission: null,
  execute: async (ctx) => ({ services: ctx.services }),
});
