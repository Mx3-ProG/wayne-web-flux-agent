import { fieldsForEntity, normalizeHeader, type ImportEntityType } from "@/lib/integrations/csv/fields";

// Proposition automatique de mapping colonne CSV -> champ canonique.
// Correspondance déterministe (normalisation + égalité ou inclusion) —
// aucun appel IA. L'utilisateur corrige ensuite ce qui n'a pas matché
// (écran de mapping), le reste est un gain de temps, pas une vérité absolue.
export function proposeMapping(headers: string[], entityType: ImportEntityType): Record<string, string | null> {
  const fields = fieldsForEntity(entityType);
  const mapping: Record<string, string | null> = {};
  const usedFields = new Set<string>();

  for (const header of headers) {
    const normalized = normalizeHeader(header);
    let matchedKey: string | null = null;

    for (const field of fields) {
      if (usedFields.has(field.key)) continue;
      const candidates = [field.key, field.label, ...field.synonyms].map(normalizeHeader);
      if (candidates.includes(normalized)) {
        matchedKey = field.key;
        break;
      }
    }
    if (!matchedKey) {
      for (const field of fields) {
        if (usedFields.has(field.key)) continue;
        const candidates = [field.key, field.label, ...field.synonyms].map(normalizeHeader);
        if (candidates.some((c) => normalized.includes(c) || c.includes(normalized))) {
          matchedKey = field.key;
          break;
        }
      }
    }

    mapping[header] = matchedKey;
    if (matchedKey) usedFields.add(matchedKey);
  }

  return mapping;
}

export function missingRequiredFields(
  mapping: Record<string, string | null>,
  entityType: ImportEntityType
): string[] {
  const mappedKeys = new Set(Object.values(mapping).filter((v): v is string => Boolean(v)));
  return fieldsForEntity(entityType)
    .filter((f) => f.required && !mappedKeys.has(f.key))
    .map((f) => f.key);
}
