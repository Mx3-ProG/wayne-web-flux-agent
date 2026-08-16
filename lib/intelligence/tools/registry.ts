import type { ToolDefinition } from "./types";
import { getBusinessInfoTool } from "./get-business-info";
import { getServicesTool } from "./get-services";
import { getAvailableSlotsTool } from "./get-available-slots";
import { findCustomerTool } from "./find-customer";
import { createCustomerTool } from "./create-customer";
import { createAppointmentTool } from "./create-appointment";
import { rescheduleAppointmentTool } from "./reschedule-appointment";
import { cancelAppointmentTool } from "./cancel-appointment";
import { transferToHumanTool } from "./transfer-to-human";

// Catalogue complet des outils métier. La liste réellement exposée au modèle
// pour un appel donné est filtrée par tenant, voir ../permissions.ts.
export const TOOL_REGISTRY: ToolDefinition[] = [
  getBusinessInfoTool,
  getServicesTool,
  getAvailableSlotsTool,
  findCustomerTool,
  createCustomerTool,
  createAppointmentTool,
  rescheduleAppointmentTool,
  cancelAppointmentTool,
  transferToHumanTool,
];
