"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Écran Paramètres → Intégrations (INTEGRATIONS_PLAN.md § H). Comme pour
// l'import CSV, texte français en dur pour ce nouvel écran — pas encore
// intégré à lib/i18n (suivi à faire avant mise en avant hors marché FR).

type IntegrationEntry = {
  provider: string;
  label: string;
  description: string;
  canAccess: string[];
  cannotAccess: string[];
  status: "connected" | "disconnected" | "error" | "needs_reauth";
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  lastError: string | null;
};

const STATUS_LABEL: Record<IntegrationEntry["status"], string> = {
  connected: "Connecté",
  disconnected: "Non connecté",
  error: "Erreur de synchronisation",
  needs_reauth: "Reconnexion nécessaire",
};

export function IntegrationsPanel({ initialEntries }: { initialEntries: IntegrationEntry[] }) {
  const [entries, setEntries] = useState<IntegrationEntry[]>(initialEntries);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/integrations");
    if (res.ok) {
      const data = await res.json();
      setEntries(data.integrations ?? []);
    }
  }

  async function disconnect(provider: string) {
    setBusyProvider(provider);
    await fetch(`/api/integrations/${provider}/disconnect`, { method: "POST" });
    await refresh();
    setBusyProvider(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {entries.map((entry) => (
        <Card key={entry.provider}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{entry.label}</span>
              <span
                className={
                  entry.status === "connected"
                    ? "text-xs font-medium text-green-600"
                    : entry.status === "error" || entry.status === "needs_reauth"
                      ? "text-xs font-medium text-destructive"
                      : "text-xs text-muted-foreground"
                }
              >
                {STATUS_LABEL[entry.status]}
              </span>
            </CardTitle>
            <CardDescription>{entry.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                {entry.canAccess.map((item) => (
                  <span key={item} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                {entry.cannotAccess.map((item) => (
                  <span key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {entry.status === "error" && entry.lastError && (
              <p className="text-sm text-destructive">Dernière erreur : {entry.lastError}</p>
            )}

            {entry.status === "connected" ? (
              <Button
                variant="ghost"
                disabled={busyProvider === entry.provider}
                onClick={() => void disconnect(entry.provider)}
              >
                Déconnecter
              </Button>
            ) : (
              <Button asChild>
                <a href={`/api/integrations/${entry.provider}/connect`}>Connecter</a>
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
