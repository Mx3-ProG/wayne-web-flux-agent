// Catalogue des connecteurs présentés à l'utilisateur — texte en langage
// clair, distinct des `capabilities` techniques (INTEGRATIONS_PLAN.md § H :
// "FLUX pourra accéder à ✓ ... FLUX ne pourra pas ✗ ..."). Un seul provider
// pour l'instant ; nouvelle entrée à ajouter ici pour chaque connecteur.

export type IntegrationCatalogEntry = {
  provider: string;
  label: string;
  description: string;
  canAccess: string[];
  cannotAccess: string[];
};

export const INTEGRATIONS_CATALOG: IntegrationCatalogEntry[] = [
  {
    provider: "google_calendar",
    label: "Google Calendar",
    description:
      "Vos rendez-vous FLUX confirmés sont ajoutés à votre agenda Google, pour ne plus avoir à les recopier.",
    canAccess: [
      "Créer et mettre à jour les événements correspondant à vos rendez-vous FLUX",
      "Lire les événements de votre agenda principal",
    ],
    cannotAccess: [
      "Vos autres agendas Google",
      "Vos contacts, emails ou données bancaires",
    ],
  },
];

export function getCatalogEntry(provider: string): IntegrationCatalogEntry | null {
  return INTEGRATIONS_CATALOG.find((entry) => entry.provider === provider) ?? null;
}
