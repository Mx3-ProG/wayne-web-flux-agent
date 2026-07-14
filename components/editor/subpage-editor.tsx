"use client";

// Éditeur d'une sous-page : miroir léger de PageEditor. Autosave débouncé
// vers le brouillon (site_pages.draft), preview live VitrineSubpage à droite.
// La publication reste l'acte global du site (PublishButton, 5 crédits).

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Offer, Page, SitePage, SitePageDraftFields } from "@/lib/types";
import {
  deleteSitePage,
  restoreSitePage,
  saveSitePageFields,
} from "@/app/(app)/ma-page/subpage-actions";
import {
  VitrineSubpage,
} from "@/components/vitrine/vitrine-subpage";
import type {
  CategoryWithProducts,
  FamilyWithServices,
} from "@/components/vitrine/vitrine-view";
import { PhotoUpload } from "./photo-upload";
import { PublishButton } from "./publish-button";
import { SectionsPanel } from "./sections-panel";
import { PagesBar } from "./pages-bar";
import { useDraftAutosave } from "./use-draft-autosave";
import type { PublishProps } from "./page-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ExternalLink, FileText, Trash2, Undo2 } from "lucide-react";
import styles from "./page-editor-redesign.module.css";

type Props = {
  page: Page; // home avec brouillon appliqué (thème, couleurs, footer…)
  sitePage: SitePage; // ligne brute (draft séparé)
  sitePages: SitePage[];
  subpageLimit: number;
  previewFamilies: FamilyWithServices[];
  previewProducts: CategoryWithProducts[];
  previewOffers: Offer[];
  publish: PublishProps;
};

export function SubpageEditor({
  page,
  sitePage,
  sitePages,
  subpageLimit,
  previewFamilies,
  previewProducts,
  previewOffers,
  publish,
}: Props) {
  const router = useRouter();
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [panelMode, setPanelMode] = useState<"edit" | "preview">("edit");
  const [deleting, startDeleting] = useTransition();

  // L'éditeur travaille sur le brouillon : état publié + modifs en attente.
  const merged: SitePage = { ...sitePage, ...(sitePage.draft ?? {}) };
  const { state: draft, patch, saving, dirty } = useDraftAutosave<
    Pick<SitePage, keyof SitePageDraftFields>
  >(
    {
      path: merged.path,
      title: merged.title,
      subtitle: merged.subtitle,
      hero_url: merged.hero_url,
      seo: merged.seo ?? {},
      sections: merged.sections,
    },
    (fields) => saveSitePageFields(sitePage.id, fields),
    { initiallyDirty: publish.hasDraft }
  );

  const previewSitePage: SitePage = { ...merged, ...draft };
  const pathLocked = sitePage.draft_status !== "new";
  const pendingDeletion = sitePage.draft_status === "deleted";

  function onDelete() {
    if (
      !window.confirm(
        pathLocked
          ? "Cette page sera retirée de ton site à la prochaine publication. Continuer ?"
          : "Supprimer cette page brouillon ? Cette action est immédiate."
      )
    ) {
      return;
    }
    startDeleting(async () => {
      const result = await deleteSitePage(sitePage.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (sitePage.draft_status === "new") {
        router.push("/ma-page?view=editor");
      } else {
        router.refresh();
      }
    });
  }

  function onRestore() {
    startDeleting(async () => {
      const result = await restoreSitePage(sitePage.id);
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  return (
    <>
      <div className={styles.mobileSwitch} aria-label="Mode de l’éditeur">
        <button
          className={panelMode === "edit" ? styles.active : ""}
          type="button"
          onClick={() => setPanelMode("edit")}
        >
          Réglages
        </button>
        <button
          className={panelMode === "preview" ? styles.active : ""}
          type="button"
          onClick={() => setPanelMode("preview")}
        >
          Aperçu
        </button>
      </div>

      <section className={styles.royalHero}>
        <span className={styles.overline}>
          <FileText aria-hidden="true" />
          Page « {draft.title || draft.path} »
        </span>
        <h1>
          Une page de <span>ton site</span>
        </h1>
        <p>
          Compose cette page avec les mêmes blocs que ta page d&apos;accueil.
          Elle sera en ligne sur /p/{page.slug}/{draft.path} à la prochaine
          publication.
        </p>
        <div className={styles.heroActions}>
          <div className={styles.saveStatus} data-saving={saving}>
            <span />
            {saving
              ? "Enregistrement du brouillon..."
              : dirty
                ? "Brouillon enregistré — modifications non publiées"
                : "Ton site en ligne est à jour"}
          </div>
          <PublishButton {...publish} hasDraft={dirty || publish.hasDraft} />
          {sitePage.published && (
            <Button asChild variant="secondary" className={styles.openPage}>
              <Link href={`/p/${page.slug}/${sitePage.path}`} target="_blank">
                Voir la page <ExternalLink aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </section>

      <div className={styles.editor}>
        <div
          className={`${styles.panel} ${panelMode === "preview" ? styles.panelHidden : ""} space-y-4`}
        >
          <PagesBar
            pageId={page.id}
            sitePages={sitePages}
            activeSitePageId={sitePage.id}
            limit={subpageLimit}
          />

          {pendingDeletion && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <p className="text-sm">
                Cette page sera supprimée à la prochaine publication.
              </p>
              <Button
                variant="secondary"
                size="sm"
                disabled={deleting}
                onClick={onRestore}
              >
                <Undo2 aria-hidden="true" /> Garder la page
              </Button>
            </div>
          )}

          <Accordion
            type="single"
            collapsible
            defaultValue="infos"
            className={styles.sectionList}
          >
            {/* Infos de la page */}
            <AccordionItem value="infos" className="border rounded-xl px-4">
              <AccordionTrigger>La page — titre, adresse, bannière</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-1">
                <div className="space-y-2">
                  <Label>Titre de la page</Label>
                  <Input
                    value={draft.title}
                    maxLength={80}
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sous-titre (facultatif)</Label>
                  <Input
                    value={draft.subtitle}
                    maxLength={200}
                    onChange={(e) => patch({ subtitle: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adresse de la page</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      /p/{page.slug}/
                    </span>
                    <Input
                      value={draft.path}
                      maxLength={48}
                      disabled={pathLocked}
                      onChange={(e) => patch({ path: e.target.value })}
                    />
                  </div>
                  {pathLocked && (
                    <p className="text-xs text-muted-foreground">
                      L&apos;adresse d&apos;une page déjà publiée ne peut plus
                      changer (elle est peut-être déjà référencée).
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Bannière de la page (facultatif)</Label>
                  <div className="flex items-center gap-3">
                    <PhotoUpload
                      userId={page.user_id}
                      label="Choisir une photo"
                      onUploaded={(url) => patch({ hero_url: url })}
                    />
                    {draft.hero_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => patch({ hero_url: null })}
                      >
                        Retirer
                      </Button>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Sections */}
            <AccordionItem value="sections" className="border rounded-xl px-4">
              <AccordionTrigger>Les sections de cette page</AccordionTrigger>
              <AccordionContent className="pt-1">
                <SectionsPanel
                  sections={draft.sections ?? []}
                  userId={page.user_id}
                  pageAddress={page.address}
                  subpage
                  onChange={(sections) => patch({ sections })}
                />
              </AccordionContent>
            </AccordionItem>

            {/* SEO */}
            <AccordionItem value="seo" className="border rounded-xl px-4">
              <AccordionTrigger>Référencement (SEO)</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-1">
                <div className="space-y-2">
                  <Label>Titre Google ({(draft.seo?.title ?? "").length}/60)</Label>
                  <Input
                    value={draft.seo?.title ?? ""}
                    maxLength={60}
                    onChange={(e) =>
                      patch({ seo: { ...draft.seo, title: e.target.value } })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Description Google ({(draft.seo?.description ?? "").length}/160)
                  </Label>
                  <Textarea
                    value={draft.seo?.description ?? ""}
                    rows={3}
                    className={styles.longText}
                    maxLength={160}
                    onChange={(e) =>
                      patch({
                        seo: { ...draft.seo, description: e.target.value },
                      })
                    }
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={deleting || pendingDeletion}
            onClick={onDelete}
          >
            <Trash2 aria-hidden="true" /> Supprimer cette page
          </Button>
        </div>

        {/* Préview live */}
        <div
          className={`${styles.previewPanel} ${panelMode === "edit" ? styles.panelHidden : ""}`}
        >
          <div className={styles.previewToolbar}>
            <p>Ta page, en direct</p>
            <div className={styles.deviceToggle}>
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={previewMode === "mobile" ? styles.active : ""}
              >
                Téléphone
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={previewMode === "desktop" ? styles.active : ""}
              >
                Ordi
              </button>
            </div>
          </div>
          <div
            className={`${styles.device} ${previewMode === "mobile" ? styles.deviceMobile : styles.deviceDesktop}`}
          >
            <div className={styles.deviceScreen}>
              <VitrineSubpage
                page={page}
                sitePage={previewSitePage}
                families={previewFamilies}
                productCategories={previewProducts}
                offers={previewOffers}
                preview
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
