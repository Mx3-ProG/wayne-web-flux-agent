import type { Connector } from "@/lib/integrations/types";
import { googleCalendarConnector } from "@/lib/integrations/connectors/google-calendar/connector";

// Registre statique des connecteurs disponibles — même esprit que
// lib/verticals.ts : table figée construite une fois au chargement du
// module, pas de découverte dynamique ni d'appel d'enregistrement mutable
// (évite tout problème de double-registration en dev avec le hot reload).
const CONNECTORS: Record<string, Connector> = {
  [googleCalendarConnector.provider]: googleCalendarConnector,
};

export function getConnector(provider: string): Connector | null {
  return CONNECTORS[provider] ?? null;
}

export function listConnectors(): Connector[] {
  return Object.values(CONNECTORS);
}
