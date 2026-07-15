export function formatAdminDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

export function formatSeconds(value: number | string | null | undefined): string {
  const seconds = Math.max(0, Number(value ?? 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

export function shortId(value: string): string {
  return `${value.slice(0, 8)}…`;
}

