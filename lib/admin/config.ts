import "server-only";

import type { AdminPermission } from "@/lib/types";

export const ADMIN_PERMISSIONS: ReadonlyArray<{
  value: AdminPermission;
  label: string;
}> = [
  { value: "users.read", label: "Utilisateurs" },
  { value: "customers.read", label: "Clients et activités" },
  { value: "sites.moderate", label: "Modération des boutiques" },
  { value: "flux.review", label: "Revue FLUX" },
  { value: "credits.manage", label: "Ajustement des crédits" },
  { value: "billing.read", label: "Facturation" },
  { value: "security.read", label: "Sécurité et audits" },
] as const;

export function adminEntryKey(): string | null {
  const key = process.env.ADMIN_ENTRY_KEY?.trim();
  return key && key.length >= 24 ? key : null;
}

export function adminBasePath(): string {
  const key = adminEntryKey();
  if (!key) throw new Error("ADMIN_ENTRY_KEY doit contenir au moins 24 caractères.");
  return `/${key}`;
}

