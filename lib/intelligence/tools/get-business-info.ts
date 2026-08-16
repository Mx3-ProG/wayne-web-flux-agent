import { z } from "zod";
import { defineTool } from "./types";

export const getBusinessInfoTool = defineTool({
  name: "get_business_info",
  description:
    "Renvoie les informations générales de l'entreprise : nom, adresse, ville, téléphone, horaires, description.",
  schema: z.object({}),
  permission: null,
  execute: async (ctx) => ({
    businessName: ctx.businessName,
    address: ctx.address,
    city: ctx.city,
    phone: ctx.phone,
    hoursText: ctx.hoursText,
    description: ctx.companyDescription,
  }),
});
