import type { AdminPermission } from "@/lib/types";

export const ADMIN_PERMISSION_OPTIONS: ReadonlyArray<{ value: AdminPermission; label: string }> = [
  { value: "users.read", label: "Utilisateurs" },
  { value: "customers.read", label: "Clients et activités" },
  { value: "sites.moderate", label: "Modération des boutiques" },
  { value: "flux.review", label: "Revue FLUX" },
  { value: "credits.manage", label: "Ajustement des crédits" },
  { value: "billing.read", label: "Facturation" },
  { value: "security.read", label: "Sécurité et audits" },
];

