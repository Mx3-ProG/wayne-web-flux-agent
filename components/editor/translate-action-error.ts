import type { EditorDict } from "@/lib/i18n/get-dictionary";
import { KARLMADA_BLOCK_MESSAGE } from "@/lib/karlmada-constants";

// Les server actions de l'éditeur renvoient soit un code stable
// (ex. "page_not_found"), soit — pour la modération KarlMada — le message
// français fixe exporté par lib/karlmada.ts. On normalise les deux vers le
// dictionnaire de la locale du dashboard.
export function translateActionError(
  errors: EditorDict["actionErrors"],
  error: string
): string {
  const code = error === KARLMADA_BLOCK_MESSAGE ? "content_blocked" : error;
  return errors[code as keyof EditorDict["actionErrors"]] ?? errors.unknown;
}
