"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPage } from "@/app/(app)/ma-page/actions";
import { KARLMADA_BLOCK_MESSAGE } from "@/lib/karlmada-constants";
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
import { useI18n } from "@/components/i18n-provider";

// Première visite : 3 questions et la vitrine existe, pré-remplie pour le métier.
// `redirectTo` permet de réutiliser le wizard pour créer un projet supplémentaire.
export function CreatePageWizard({ redirectTo }: { redirectTo?: string } = {}) {
  const router = useRouter();
  const { editor, verticals } = useI18n();
  const t = editor.wizard;
  const [vertical, setVertical] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const selected = vertical ? (verticals.find((v) => v.slug === vertical) ?? null) : null;

  async function submit() {
    setError("");
    setPending(true);
    const result = await createPage({ vertical, businessName, jobTitle, city });
    setPending(false);
    if (result.error) {
      const code = result.error === KARLMADA_BLOCK_MESSAGE ? "content_blocked" : result.error;
      setError(t.errors[code as keyof typeof t.errors] ?? t.errors.unknown);
    } else if (redirectTo) router.push(redirectTo);
    else router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t.activity}</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {verticals.map((v) => (
                <button
                  key={v.slug}
                  type="button"
                  onClick={() => {
                    setVertical(v.slug);
                    if (!jobTitle || !verticals.some((x) => x.jobTitles.includes(jobTitle)))
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
                <Label htmlFor="wizard-name">{t.businessName}</Label>
                <Input
                  id="wizard-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={t.businessNamePlaceholder}
                  maxLength={60}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-job">{t.jobTitle}</Label>
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
                <Label htmlFor="wizard-city">{t.city}</Label>
                <Input
                  id="wizard-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t.cityPlaceholder}
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
                {pending ? t.creating : t.create}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
