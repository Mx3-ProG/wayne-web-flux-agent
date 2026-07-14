// Plan de rendu des sections, partagé entre la home (vitrine-view) et les
// sous-pages (vitrine-subpage) : les sections pleine largeur (promo, offres)
// vivent seules ; les autres sont regroupées dans un wrapper .services.
// Boutique + prestations adjacentes fusionnent dans le bloc catalogue
// historique (un seul titre, produits en haut, réservations en bas).

import { hasSectionStyle, type PageSection } from "@/lib/sections";

export type PlanItem =
  | { kind: "promo" }
  | { kind: "offres"; section: PageSection }
  // Section avec une apparence personnalisée (fond, largeur…) : rendue seule,
  // pleine largeur, dans un section-shell — hors du groupe .services.
  | { kind: "styled"; section: PageSection }
  | { kind: "group"; items: GroupItem[] };
export type GroupItem =
  | { kind: "catalogue"; key: string }
  | { kind: "section"; key: string; section: PageSection };

export function buildPlan(sections: PageSection[]): PlanItem[] {
  const plan: PlanItem[] = [];
  let group: GroupItem[] | null = null;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (section.type === "promo") {
      group = null;
      plan.push({ kind: "promo" });
      continue;
    }
    if (section.type === "offres") {
      group = null;
      plan.push({ kind: "offres", section });
      continue;
    }
    if (hasSectionStyle(section)) {
      group = null;
      plan.push({ kind: "styled", section });
      continue;
    }
    if (!group) {
      group = [];
      plan.push({ kind: "group", items: group });
    }
    const next = sections[i + 1];
    const pair =
      ((section.type === "boutique" && next?.type === "prestations") ||
        (section.type === "prestations" && next?.type === "boutique")) &&
      !(next && hasSectionStyle(next));
    if (pair) {
      group.push({ kind: "catalogue", key: "catalogue" });
      i++;
    } else {
      group.push({ kind: "section", key: section.id, section });
    }
  }
  return plan;
}
