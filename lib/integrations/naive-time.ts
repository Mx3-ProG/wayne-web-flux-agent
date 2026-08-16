// Arithmétique sur des horaires "naïfs" (sans fuseau), au format
// "YYYY-MM-DDTHH:MM:SS" — c'est le format de `bookings.date`/`start_time`
// une fois combinés, et celui attendu par Google Calendar quand `timeZone`
// est fourni séparément (cf. connector.ts). Volontairement PAS de `new
// Date(naiveString)` : ce constructeur interprète la chaîne dans le fuseau
// du runtime (UTC sur Vercel), ce qui déciderait silencieusement d'un
// fuseau différent de celui de la boutique (Europe/Paris) selon où le code
// s'exécute. `Date.UTC(...)` sur des composants numériques bruts sert ici
// uniquement de calculatrice, jamais d'horloge réelle.

const NAIVE_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

export function toNaiveIso(date: string, time: string): string {
  const hhmmss = time.length === 5 ? `${time}:00` : time;
  return `${date}T${hhmmss}`;
}

export function addMinutes(naiveIso: string, minutes: number): string {
  const match = naiveIso.match(NAIVE_RE);
  if (!match) throw new Error(`invalid_naive_iso:${naiveIso}`);
  const [, y, mo, d, h, mi, s] = match.map(Number);
  const ms = Date.UTC(y, mo - 1, d, h, mi, s) + minutes * 60_000;
  const result = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${result.getUTCFullYear()}-${pad(result.getUTCMonth() + 1)}-${pad(result.getUTCDate())}T${pad(result.getUTCHours())}:${pad(result.getUTCMinutes())}:${pad(result.getUTCSeconds())}`;
}
