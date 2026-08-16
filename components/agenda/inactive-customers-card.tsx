"use client";

import { useState } from "react";
import { Mail, MessageCircleMore, UserRoundX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildReengagementMessage, type InactiveCustomer } from "@/lib/integrations/automations/inactive-customers";

// Carte "clients à recontacter" — Phase 4 de la couche d'intégration.
// Volontairement hors du composant AgendaView (déjà volumineux, entièrement
// piloté par lib/i18n) : texte français en dur ici, comme pour les écrans
// import/intégrations livrés en Phase 1/2 (suivi i18n commun aux trois).
export function InactiveCustomersCard({ customers }: { customers: InactiveCustomer[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (customers.length === 0) return null;

  async function copyMessage(customer: InactiveCustomer) {
    await navigator.clipboard.writeText(buildReengagementMessage(customer));
    setCopiedId(customer.id);
    setTimeout(() => setCopiedId((current) => (current === customer.id ? null : current)), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRoundX className="size-4" aria-hidden="true" /> Clients à recontacter
        </CardTitle>
        <CardDescription>
          {customers.length} client{customers.length > 1 ? "s n'ont" : " n'a"} pas repris rendez-vous depuis un
          moment, sans RDV déjà prévu.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {customers.slice(0, 10).map((customer) => (
          <div key={customer.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <div className="flex flex-col">
              <span className="font-medium">{customer.firstName}</span>
              <span className="text-xs text-muted-foreground">
                Dernière visite il y a {customer.weeksSinceVisit} semaines · {customer.lastServiceName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => void copyMessage(customer)}>
                {copiedId === customer.id ? "Copié !" : "Copier le message"}
              </Button>
              <Button variant="ghost" size="icon-sm" asChild>
                <a
                  href={`sms:${customer.phone}?body=${encodeURIComponent(buildReengagementMessage(customer))}`}
                  aria-label={`Envoyer un SMS à ${customer.firstName}`}
                >
                  <MessageCircleMore className="size-4" aria-hidden="true" />
                </a>
              </Button>
              {customer.email && (
                <Button variant="ghost" size="icon-sm" asChild>
                  <a
                    href={`mailto:${customer.email}?subject=${encodeURIComponent("On vous a manqué !")}&body=${encodeURIComponent(buildReengagementMessage(customer))}`}
                    aria-label={`Envoyer un email à ${customer.firstName}`}
                  >
                    <Mail className="size-4" aria-hidden="true" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
