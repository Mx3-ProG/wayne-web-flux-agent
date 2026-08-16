// Champs cibles par type d'entité importable, et leur dictionnaire de
// synonymes d'en-têtes. Volontairement plat et déterministe (pas d'IA ici) :
// couvre les intitulés les plus courants des exports français (tableur,
// caisse, ancien logiciel de réservation). Un fallback IA sur les seuls
// en-têtes non résolus (jamais les valeurs des lignes) est une amélioration
// possible mais non implémentée dans ce MVP — cf. INTEGRATIONS_PLAN.md § E.

export type ImportEntityType = "customers" | "appointments" | "products" | "services";

export type FieldDef = {
  key: string;
  label: string;
  required: boolean;
  synonyms: string[];
};

const FIELDS_BY_ENTITY: Record<ImportEntityType, FieldDef[]> = {
  customers: [
    { key: "firstName", label: "Prénom", required: true, synonyms: ["prenom", "prénom", "first name", "firstname", "nom"] },
    { key: "lastName", label: "Nom", required: false, synonyms: ["nom de famille", "last name", "lastname", "surname"] },
    { key: "phone", label: "Téléphone", required: true, synonyms: ["telephone", "téléphone", "tel", "portable", "mobile", "phone", "gsm"] },
    { key: "email", label: "Email", required: false, synonyms: ["email", "e-mail", "mail", "adresse mail", "adresse email"] },
    { key: "birthday", label: "Date de naissance", required: false, synonyms: ["naissance", "date de naissance", "birthday", "anniversaire"] },
    { key: "notes", label: "Notes", required: false, synonyms: ["note", "notes", "commentaire", "remarque"] },
  ],
  appointments: [
    { key: "firstName", label: "Prénom client", required: true, synonyms: ["prenom", "prénom", "client", "nom client", "first name"] },
    { key: "phone", label: "Téléphone", required: true, synonyms: ["telephone", "téléphone", "tel", "portable", "mobile", "phone"] },
    { key: "email", label: "Email", required: false, synonyms: ["email", "e-mail", "mail"] },
    { key: "serviceName", label: "Prestation", required: true, synonyms: ["prestation", "service", "soin", "acte"] },
    { key: "date", label: "Date", required: true, synonyms: ["date", "date rdv", "date du rendez-vous", "jour"] },
    { key: "startTime", label: "Heure", required: true, synonyms: ["heure", "heure rdv", "heure de début", "start time"] },
    { key: "durationMin", label: "Durée (min)", required: false, synonyms: ["duree", "durée", "duration"] },
    { key: "priceCents", label: "Prix", required: false, synonyms: ["prix", "montant", "tarif", "price"] },
  ],
  services: [
    { key: "name", label: "Nom", required: true, synonyms: ["nom", "prestation", "service", "name"] },
    { key: "durationMin", label: "Durée (min)", required: false, synonyms: ["duree", "durée", "duration"] },
    { key: "priceCents", label: "Prix", required: false, synonyms: ["prix", "montant", "tarif", "price"] },
  ],
  products: [
    { key: "name", label: "Nom", required: true, synonyms: ["nom", "produit", "article", "name"] },
    { key: "priceCents", label: "Prix", required: false, synonyms: ["prix", "montant", "tarif", "price"] },
  ],
};

export function fieldsForEntity(entityType: ImportEntityType): FieldDef[] {
  return FIELDS_BY_ENTITY[entityType];
}

export function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
