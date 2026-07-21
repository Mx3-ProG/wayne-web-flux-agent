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
import { useI18n } from "@/components/i18n-provider";
import { translateActionError } from "./translate-action-error";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";

type Props = {
  page: Page; // home avec brouillon appliqué (thème, couleurs, footer…)
  sitePage: SitePage; // ligne brute (draft séparé)
  sitePages: SitePage[];
  subpageLimit: number;
  previewFamilies: FamilyWithServices[];
  previewProducts: CategoryWithProducts[];
  previewOffers: Offer[];
  publish: PublishProps;
  // Langue du PROJET : voir la même note dans page-editor.tsx.
  storefrontDict: StorefrontDict;
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
  storefrontDict,
}: Props) {
  const router = useRouter();
  const { editor, dictionary } = useI18n();
  const t = editor.subpageEditor;
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
    {
      initiallyDirty: publish.hasDraft,
      translateError: (error) => translateActionError(editor.actionErrors, error),
    }
  );

  const previewSitePage: SitePage = { ...merged, ...draft };
  const pathLocked = sitePage.draft_status !== "new";
  const pendingDeletion = sitePage.draft_status === "deleted";

  function onDelete() {
    if (
      !window.confirm(
        pathLocked ? t.confirmDeleteLocked : t.confirmDeleteDraft
      )
    ) {
      return;
    }
    startDeleting(async () => {
      const result = await deleteSitePage(sitePage.id);
      if (result.error) {
        toast.error(translateActionError(editor.actionErrors, result.error));
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
      if (result.error) toast.error(translateActionError(editor.actionErrors, result.error));
      else router.refresh();
    });
  }

  return (
    <>
      <div className={styles.mobileSwitch} aria-label={t.editorMode}>
        <button
          className={panelMode === "edit" ? styles.active : ""}
          type="button"
          onClick={() => setPanelMode("edit")}
        >
          {t.settingsTab}
        </button>
        <button
          className={panelMode === "preview" ? styles.active : ""}
          type="button"
          onClick={() => setPanelMode("preview")}
        >
          {t.previewTab}
        </button>
      </div>

      <section className={styles.royalHero}>
        <span className={styles.overline}>
          <FileText aria-hidden="true" />
          {t.pageOverline.replace("{name}", draft.title || draft.path)}
        </span>
        <h1>
          {t.heroTitleStart} <span>{t.heroTitleEm}</span>
        </h1>
        <p>
          {t.heroText.replace("{slug}", page.slug).replace("{path}", draft.path)}
        </p>
        <div className={styles.heroActions}>
          <div className={styles.saveStatus} data-saving={saving}>
            <span />
            {saving ? t.saving : dirty ? t.unpublished : t.upToDate}
          </div>
          <PublishButton {...publish} hasDraft={dirty || publish.hasDraft} />
          {sitePage.published && (
            <Button asChild variant="secondary" className={styles.openPage}>
              <Link href={`/p/${page.slug}/${sitePage.path}`} target="_blank">
                {t.viewPage} <ExternalLink aria-hidden="true" />
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
              <p className="text-sm">{t.pendingDeletion}</p>
              <Button
                variant="secondary"
                size="sm"
                disabled={deleting}
                onClick={onRestore}
              >
                <Undo2 aria-hidden="true" /> {t.keepPage}
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
              <AccordionTrigger>{t.infoAccordion}</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-1">
                <div className="space-y-2">
                  <Label>{t.pageTitle}</Label>
                  <Input
                    value={draft.title}
                    maxLength={80}
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.subtitleOptional}</Label>
                  <Input
                    value={draft.subtitle}
                    maxLength={200}
                    onChange={(e) => patch({ subtitle: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.pageAddress}</Label>
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
                    <p className="text-xs text-muted-foreground">{t.addressLockedHint}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t.bannerOptional}</Label>
                  <div className="flex items-center gap-3">
                    <PhotoUpload
                      userId={page.user_id}
                      label={t.choosePhoto}
                      messages={dictionary.photoUpload}
                      onUploaded={(url) => patch({ hero_url: url })}
                    />
                    {draft.hero_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => patch({ hero_url: null })}
                      >
                        {t.remove}
                      </Button>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Sections */}
            <AccordionItem value="sections" className="border rounded-xl px-4">
              <AccordionTrigger>{t.sectionsAccordion}</AccordionTrigger>
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
              <AccordionTrigger>{t.seoAccordion}</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-1">
                <div className="space-y-2">
                  <Label>
                    {t.googleTitle.replace("{count}", String((draft.seo?.title ?? "").length))}
                  </Label>
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
                    {t.googleDescription.replace(
                      "{count}",
                      String((draft.seo?.description ?? "").length)
                    )}
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
            <Trash2 aria-hidden="true" /> {t.deletePage}
          </Button>
        </div>

        {/* Préview live */}
        <div
          className={`${styles.previewPanel} ${panelMode === "edit" ? styles.panelHidden : ""}`}
        >
          <div className={styles.previewToolbar}>
            <p>{t.livePreview}</p>
            <div className={styles.deviceToggle}>
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={previewMode === "mobile" ? styles.active : ""}
              >
                {t.mobile}
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={previewMode === "desktop" ? styles.active : ""}
              >
                {t.desktop}
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
                t={storefrontDict}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
