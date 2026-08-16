"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Panneau d'import CSV — Phase 1 de la couche d'intégration
// (INTEGRATIONS_PLAN.md § E). Implémentation volontairement simple : pas
// encore de traduction complète (lib/i18n) pour ce nouvel écran, à combler
// avant une éventuelle mise en avant hors du marché francophone.

type EntityType = "customers" | "appointments" | "products" | "services";

const ENTITY_LABELS: Record<EntityType, string> = {
  customers: "Clients",
  appointments: "Rendez-vous",
  services: "Prestations",
  products: "Produits",
};

type Job = {
  id: string;
  status: string;
  entity_type: EntityType;
  headers: string[];
  column_mapping: Record<string, string | null>;
  total_rows: number | null;
  imported_rows: number;
  merged_rows: number;
  skipped_rows: number;
  error_rows: number;
};

type Step = "upload" | "mapping" | "confirmed";

export function ImportCsvPanel() {
  const [entityType, setEntityType] = useState<EntityType>("customers");
  const [step, setStep] = useState<Step>("upload");
  const [job, setJob] = useState<Job | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", entityType);
      const res = await fetch("/api/imports", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "upload_failed");
      setJob(data.job as Job);
      setPreview(data.preview ?? []);
      setStep("mapping");
    } catch {
      setError("L'import du fichier a échoué. Vérifiez qu'il s'agit bien d'un CSV.");
    } finally {
      setBusy(false);
    }
  }

  async function updateMappingField(header: string, field: string | null) {
    if (!job) return;
    const nextMapping = { ...job.column_mapping, [header]: field };
    setJob({ ...job, column_mapping: nextMapping });
    await fetch(`/api/imports/${job.id}/mapping`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapping: nextMapping }),
    });
  }

  async function handleConfirm() {
    if (!job) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/imports/${job.id}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error === "missing_required_fields"
            ? `Champs obligatoires non associés : ${data.fields.join(", ")}`
            : "La confirmation a échoué."
        );
      }
      setStep("confirmed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "La confirmation a échoué.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setJob(null);
    setPreview([]);
    setStep("upload");
    setError(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importer des données</CardTitle>
        <CardDescription>
          Déposez un export CSV (clients, rendez-vous, prestations ou produits) depuis votre ancien
          logiciel, votre caisse ou un tableur — FLUX propose un mapping automatique des colonnes,
          à corriger si besoin avant l&apos;import.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {step === "upload" && (
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">Type de données</label>
            <Select value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ENTITY_LABELS) as EntityType[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {ENTITY_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
              }}
              className="text-sm"
            />
          </div>
        )}

        {step === "mapping" && job && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {job.total_rows} lignes détectées. Vérifiez la correspondance des colonnes ci-dessous.
            </p>
            <div className="flex flex-col gap-2">
              {job.headers.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-sm">{header}</span>
                  <select
                    className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2 text-sm"
                    value={job.column_mapping[header] ?? ""}
                    onChange={(e) => void updateMappingField(header, e.target.value || null)}
                  >
                    <option value="">— Ignorer —</option>
                    {FIELD_OPTIONS[job.entity_type].map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                        {f.required ? " *" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {preview.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {job.headers.map((h) => (
                        <th key={h} className="border-b border-border px-2 py-1 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {job.headers.map((h) => (
                          <td key={h} className="px-2 py-1">
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleConfirm} disabled={busy}>
                {busy ? "Import en cours…" : "Confirmer l'import"}
              </Button>
              <Button variant="ghost" onClick={reset} disabled={busy}>
                Annuler
              </Button>
            </div>
          </div>
        )}

        {step === "confirmed" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              L&apos;import a été mis en file d&apos;attente. Le traitement se fait en arrière-plan
              (quelques minutes selon le volume) — retrouvez le suivi ci-dessous.
            </p>
            <Button variant="secondary" onClick={reset}>
              Importer un autre fichier
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const FIELD_OPTIONS: Record<EntityType, { key: string; label: string; required: boolean }[]> = {
  customers: [
    { key: "firstName", label: "Prénom", required: true },
    { key: "lastName", label: "Nom", required: false },
    { key: "phone", label: "Téléphone", required: true },
    { key: "email", label: "Email", required: false },
    { key: "birthday", label: "Date de naissance", required: false },
    { key: "notes", label: "Notes", required: false },
  ],
  appointments: [
    { key: "firstName", label: "Prénom client", required: true },
    { key: "phone", label: "Téléphone", required: true },
    { key: "email", label: "Email", required: false },
    { key: "serviceName", label: "Prestation", required: true },
    { key: "date", label: "Date", required: true },
    { key: "startTime", label: "Heure", required: true },
    { key: "durationMin", label: "Durée (min)", required: false },
    { key: "priceCents", label: "Prix", required: false },
  ],
  services: [
    { key: "name", label: "Nom", required: true },
    { key: "durationMin", label: "Durée (min)", required: false },
    { key: "priceCents", label: "Prix", required: false },
  ],
  products: [
    { key: "name", label: "Nom", required: true },
    { key: "priceCents", label: "Prix", required: false },
  ],
};
