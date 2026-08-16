import type { Booking, Customer } from "@/lib/types";

// Automatisation "clients inactifs" (Phase 4, cf. INTEGRATIONS_PLAN.md § 11
// du brief). Volontairement pure et sans IA : calcule à partir des données
// déjà chargées par app/(app)/agenda/page.tsx (aucune requête supplémentaire),
// et le message suggéré est un gabarit déterministe, pas un appel LLM — la
// donnée est structurée, un template suffit (cf. brief § 4 : "ne jamais
// envoyer inutilement des données personnelles à un LLM si une logique
// déterministe suffit").

export type InactiveCustomer = {
  id: string;
  firstName: string;
  phone: string;
  email: string | null;
  lastVisitDate: string;
  lastServiceName: string;
  weeksSinceVisit: number;
};

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export function findInactiveCustomers(
  customers: Pick<Customer, "id" | "first_name" | "phone" | "email">[],
  bookings: Pick<Booking, "customer_id" | "date" | "status" | "service_name">[],
  options: { weeksThreshold?: number; today?: Date } = {}
): InactiveCustomer[] {
  const weeksThreshold = options.weeksThreshold ?? 8;
  const today = options.today ?? new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const lastConfirmedVisit = new Map<string, { date: string; serviceName: string }>();
  const hasUpcoming = new Set<string>();

  for (const booking of bookings) {
    if (!booking.customer_id) continue;
    if (booking.status === "confirmed" && booking.date < todayIso) {
      const current = lastConfirmedVisit.get(booking.customer_id);
      if (!current || booking.date > current.date) {
        lastConfirmedVisit.set(booking.customer_id, { date: booking.date, serviceName: booking.service_name });
      }
    }
    if ((booking.status === "confirmed" || booking.status === "pending") && booking.date >= todayIso) {
      hasUpcoming.add(booking.customer_id);
    }
  }

  const result: InactiveCustomer[] = [];
  for (const customer of customers) {
    const visit = lastConfirmedVisit.get(customer.id);
    if (!visit || hasUpcoming.has(customer.id)) continue;

    const weeksSinceVisit = Math.floor(
      (today.getTime() - new Date(`${visit.date}T00:00:00Z`).getTime()) / MS_PER_WEEK
    );
    if (weeksSinceVisit < weeksThreshold) continue;

    result.push({
      id: customer.id,
      firstName: customer.first_name,
      phone: customer.phone,
      email: customer.email,
      lastVisitDate: visit.date,
      lastServiceName: visit.serviceName,
      weeksSinceVisit,
    });
  }

  return result.sort((a, b) => b.weeksSinceVisit - a.weeksSinceVisit);
}

export function buildReengagementMessage(customer: InactiveCustomer): string {
  return `Bonjour ${customer.firstName}, ça fait ${customer.weeksSinceVisit} semaines qu'on ne vous a pas vu·e pour votre ${customer.lastServiceName.toLowerCase()}. Une envie de reprendre rendez-vous ?`;
}
