"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPage } from "@/app/(app)/ma-page/actions";
import { VERTICALS, getVertical } from "@/lib/verticals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Première visite : 3 questions et la vitrine existe, pré-remplie pour le métier.
// `redirectTo` permet de réutiliser le wizard pour créer un projet supplémentaire.
export function CreatePageWizard({ redirectTo }: { redirectTo?: string } = {}) {
  const router = useRouter();
  const [vertical, setVertical] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const selected = vertical ? getVertical(vertical) : null;

  async function submit() {
    setError("");
    setPending(true);
    const result = await createPage({ vertical, businessName, jobTitle, city });
    setPending(false);
    if (result.error) setError(result.error);
    else if (redirectTo) router.push(redirectTo);
    else router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Créons ta vitrine</CardTitle>
          <CardDescription>
            3 questions, et ta page existe — déjà remplie pour ton métier. Tout
            reste modifiable ensuite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Ton activité</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {VERTICALS.map((v) => (
                <button
                  key={v.slug}
                  type="button"
                  onClick={() => {
                    setVertical(v.slug);
                    if (!jobTitle || !VERTICALS.some((x) => x.jobTitles.includes(jobTitle)))
                      setJobTitle(v.jobTitles[0]);
                  }}
                  className={`rounded-xl border px-3 py-3 text-sm text-left transition-colors ${
                    vertical === v.slug
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  <span className="block text-lg mb-1">{v.emoji}</span>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <>
              <div className="space-y-2">
                <Label htmlFor="wizard-name">Le nom de ton commerce</Label>
                <Input
                  id="wizard-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Pas de nom ? Ton prénom marche très bien."
                  maxLength={60}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-job">Ton métier (s&apos;affiche sous ton nom)</Label>
                <Input
                  id="wizard-job"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  maxLength={60}
                />
                <div className="flex flex-wrap gap-1.5">
                  {selected.jobTitles.map((jt) => (
                    <button
                      key={jt}
                      type="button"
                      onClick={() => setJobTitle(jt)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        jobTitle === jt
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-secondary"
                      }`}
                    >
                      {jt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-city">Ta ville</Label>
                <Input
                  id="wizard-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex : Lyon"
                  maxLength={60}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                size="lg"
                disabled={pending || !businessName.trim()}
                onClick={submit}
              >
                {pending ? "Création…" : "Créer ma vitrine"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
