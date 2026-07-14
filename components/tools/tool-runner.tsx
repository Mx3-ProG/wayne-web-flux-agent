"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Tool } from "@/lib/tools-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = { tool: Tool; balance: number };

// Formulaire de l'outil + résultat streamé. Le coût est affiché AVANT de
// lancer ; rien n'est prélevé en douce.
export function ToolRunner({ tool, balance }: Props) {
  const router = useRouter();
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const canAfford = balance >= tool.cost;
  const missingRequired = tool.fields.some(
    (f) => f.type === "select" && !f.optional && !inputs[f.id]
  );

  async function generate() {
    setOutput("");
    setDone(false);
    setRunning(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: tool.slug, inputs }),
      });
      if (res.status === 402) {
        const body = await res.json().catch(() => null);
        toast.error(
          body?.error === "subscription_required"
            ? "Ton essai FLUX est terminé. Choisis une formule pour continuer à générer."
            : "Plus assez de crédits. Passe à une formule FLUX pour recharger."
        );
        setRunning(false);
        return;
      }
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        toast.error(
          body?.error === "content_blocked" && body?.message
            ? body.message
            : "La génération a échoué."
        );
        setRunning(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
      setDone(true);
      router.refresh(); // met à jour le solde du header
    } catch {
      toast.error("La génération a été interrompue.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4 pt-1">
          {tool.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label>{field.label}</Label>
              {field.type === "select" ? (
                <Select
                  value={inputs[field.id] ?? ""}
                  onValueChange={(v) =>
                    setInputs((prev) => ({ ...prev, [field.id]: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="— choisir —" />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "textarea" ? (
                <Textarea
                  rows={3}
                  maxLength={400}
                  placeholder={field.placeholder}
                  value={inputs[field.id] ?? ""}
                  onChange={(e) =>
                    setInputs((prev) => ({ ...prev, [field.id]: e.target.value }))
                  }
                />
              ) : (
                <Input
                  maxLength={400}
                  placeholder={field.placeholder}
                  value={inputs[field.id] ?? ""}
                  onChange={(e) =>
                    setInputs((prev) => ({ ...prev, [field.id]: e.target.value }))
                  }
                />
              )}
            </div>
          ))}

          <div className="flex items-center justify-between gap-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Coût : <strong className="text-foreground">{tool.cost} crédits</strong>
              {" · "}Solde : {balance}
            </p>
            <Button
              size="lg"
              disabled={running || !canAfford || missingRequired}
              onClick={generate}
            >
              {running
                ? "L'IA écrit pour toi…"
                : `Générer mon résultat (${tool.cost} cr.)`}
            </Button>
          </div>
          {!canAfford && (
            <p className="text-sm text-destructive">
              Il te manque des crédits.{" "}
              <Link href="/formules" className="underline underline-offset-4">
                Découvrir les formules FLUX
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      {(output || running) && (
        <Card>
          <CardContent className="pt-1 space-y-4">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {output || "Quelques secondes de patience, l'IA réfléchit pour toi…"}
            </div>
            {done && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(output);
                    toast.success("Copié !");
                  }}
                >
                  Copier
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/resultats">Voir dans mon coffre →</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
