"use client";

// Barre des pages du projet dans l'éditeur : onglet Accueil + une sous-page
// par onglet + « Nouvelle page » (picker de modèles). Les sous-pages jamais
// publiées portent un badge « brouillon », celles en suppression différée un
// badge « suppression au prochain publish ».

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SitePage } from "@/lib/types";
import { PAGE_TEMPLATES } from "@/lib/page-templates";
import { createSitePage } from "@/app/(app)/ma-page/subpage-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Home, Plus } from "lucide-react";

type Props = {
  pageId: string;
  sitePages: SitePage[];
  activeSitePageId: string | null; // null = accueil
  limit: number;
};

export function PagesBar({ pageId, sitePages, activeSitePageId, limit }: Props) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, startCreating] = useTransition();

  const atLimit = sitePages.length >= limit;

  function create(templateId: string) {
    startCreating(async () => {
      const result = await createSitePage(pageId, { templateId });
      if (result.error || !result.sitePage) {
        toast.error(result.error ?? "Impossible de créer la page.");
        return;
      }
      setPickerOpen(false);
      router.push(`/ma-page?view=editor&p=${result.sitePage.id}`);
    });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Button
        asChild
        variant={activeSitePageId === null ? "default" : "secondary"}
        size="sm"
      >
        <Link href="/ma-page?view=editor">
          <Home aria-hidden="true" /> Accueil
        </Link>
      </Button>
      {sitePages.map((sp) => {
        const draft = { ...sp, ...(sp.draft ?? {}) };
        return (
          <Button
            key={sp.id}
            asChild
            variant={activeSitePageId === sp.id ? "default" : "secondary"}
            size="sm"
          >
            <Link href={`/ma-page?view=editor&p=${sp.id}`}>
              <FileText aria-hidden="true" />
              <span className="max-w-32 truncate">
                {draft.title || draft.path}
              </span>
              {sp.draft_status === "new" && (
                <span className="rounded-full bg-amber-500/15 px-1.5 text-[10px] font-semibold text-amber-600">
                  brouillon
                </span>
              )}
              {sp.draft_status === "deleted" && (
                <span className="rounded-full bg-destructive/15 px-1.5 text-[10px] font-semibold text-destructive">
                  à supprimer
                </span>
              )}
            </Link>
          </Button>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        disabled={atLimit || creating}
        onClick={() => setPickerOpen(true)}
      >
        <Plus aria-hidden="true" /> Nouvelle page
      </Button>
      <span className="text-xs text-muted-foreground">
        {sitePages.length}/{limit} pages
        {atLimit ? " — limite de ton forfait atteinte" : ""}
      </span>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quelle page veux-tu ajouter ?</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            {PAGE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                disabled={creating}
                className="rounded-lg border border-border p-3 text-left hover:border-foreground/40 disabled:opacity-50"
                onClick={() => create(template.id)}
              >
                <p className="text-sm font-medium">{template.label}</p>
                <p className="text-xs text-muted-foreground">
                  {template.description}
                </p>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            La page est pré-remplie puis entièrement modifiable. Elle reste en
            brouillon tant que tu ne publies pas.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
