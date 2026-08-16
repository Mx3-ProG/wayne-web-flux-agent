// Pas de garde "server-only" : module pur (aucun secret, aucun I/O), ce qui
// le rend testable directement (lib/integrations/csv/parse.test.ts) — la
// frontière serveur réelle est déjà imposée par `Buffer`, indisponible côté
// navigateur, et par les routes app/api/imports qui l'appellent.
//
// Parseur CSV minimal (RFC 4180 : champs entre guillemets, guillemets
// échappés en doublant, retours à la ligne dans un champ cité). Pas de
// dépendance externe : le besoin est un CSV "raisonnable" exporté par un
// tableur ou un logiciel métier, pas un parseur généraliste.

export type ParsedCsv = {
  delimiter: string;
  headers: string[];
  rows: Record<string, string>[];
};

const CANDIDATE_DELIMITERS = [",", ";", "\t", "|"] as const;

// Décodage : on tente UTF-8 strict d'abord (le cas très majoritaire), et on
// retombe sur latin1 (Windows-1252 approximatif) si des octets invalides
// apparaissent — cas fréquent des exports Excel/logiciels de caisse anciens.
export function decodeCsvBuffer(buffer: Buffer): { text: string; encoding: "utf-8" | "latin1" } {
  const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    return { text: utf8Decoder.decode(buffer), encoding: "utf-8" };
  } catch {
    return { text: new TextDecoder("latin1").decode(buffer), encoding: "latin1" };
  }
}

export function detectDelimiter(sampleLine: string): string {
  let best = CANDIDATE_DELIMITERS[0] as string;
  let bestCount = -1;
  for (const candidate of CANDIDATE_DELIMITERS) {
    const count = sampleLine.split(candidate).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }
  return best;
}

function parseLines(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === delimiter) {
      pushField();
      i += 1;
      continue;
    }
    if (char === "\r") {
      i += 1;
      continue;
    }
    if (char === "\n") {
      pushRow();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }
  // Dernière ligne sans retour final.
  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

export function parseCsv(text: string): ParsedCsv {
  const firstLine = text.slice(0, text.indexOf("\n") > -1 ? text.indexOf("\n") : text.length);
  const delimiter = detectDelimiter(firstLine);
  const lines = parseLines(text, delimiter);
  if (lines.length === 0) return { delimiter, headers: [], rows: [] };

  const headers = lines[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let r = 1; r < lines.length; r++) {
    const line = lines[r];
    if (line.every((cell) => cell.trim() === "")) continue; // ligne vide
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = (line[idx] ?? "").trim();
    });
    rows.push(record);
  }
  return { delimiter, headers, rows };
}
