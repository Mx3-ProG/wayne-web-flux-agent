"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Generation } from "@/lib/types";
import { TOOLS } from "@/lib/tools-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function toolName(slug: string): string {
  return TOOLS.find((t) => t.slug === slug)?.name ?? slug;
}

// Le coffre-fort : tout ce qui a été créé reste accessible pour toujours.
export function GenerationList({ generations }: { generations: Generation[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Ton coffre-fort</h1>
        <p className="text-muted-foreground">
          {generations.length === 0
            ? "Tes créations seront rangées ici, à toi, pour toujours."
            : `${generations.length} création${generations.length > 1 ? "s" : ""} rangée${generations.length > 1 ? "s" : ""} ici, à toi, pour toujours. Ouvre-en une pour la relire ou la copier.`}
        </p>
      </div>

      {generations.length === 0 && (
        <Card>
          <CardContent className="pt-1 text-center py-10 space-y-3">
            <p className="text-muted-foreground">
              Rien pour l&apos;instant. Ton premier contenu est à 2 minutes.
            </p>
            <Button asChild>
              <Link href="/espace#outils">Créer mon premier contenu</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {generations.map((g) => {
          const open = openId === g.id;
          return (
            <Card key={g.id}>
              <CardContent className="pt-1">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 text-left"
                  onClick={() => setOpenId(open ? null : g.id)}
                >
                  <div>
                    <p className="font-medium">{toolName(g.tool_slug)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(g.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}{" "}
                      · {g.credits_spent} cr.
                    </p>
                  </div>
                  <span className="text-muted-foreground">
                    {open ? "Fermer" : "Ouvrir"}
                  </span>
                </button>
                {open && (
                  <div className="mt-4 space-y-3">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed rounded-lg bg-secondary/50 p-4">
                      {g.output}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(g.output);
                        toast.success("Copié !");
                      }}
                    >
                      Copier
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
