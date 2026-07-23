"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Offer, Page, SitePage } from "@/lib/types";
import type { VerticalKind } from "@/lib/verticals";
import { VITRINE_THEMES } from "@/lib/vitrine-themes";
import { designKitPatch, legacyAppearance, resolveStorefrontPresentation } from "@/lib/vitrine-design/resolver";
import {
  savePageFields,
  setStorefrontAssistantEnabled,
} from "@/app/(app)/ma-page/actions";
import { updateProduct } from "@/app/(app)/produits/actions";
import {
  VitrineView,
  type CategoryWithProducts,
  type FamilyWithServices,
} from "@/components/vitrine/vitrine-view";
import { resolveSections } from "@/lib/sections";
import { PhotoUpload } from "./photo-upload";
import { PublishButton } from "./publish-button";
import { SectionsPanel } from "./sections-panel";
import { PagesBar } from "./pages-bar";
import { NavigationPanel } from "./navigation-panel";
import { LanguageManager } from "./language-manager";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, Crown, ExternalLink, Gem, Palette } from "lucide-react";
import styles from "./page-editor-redesign.module.css";
import {
  DESIGN_KITS,
  DESIGN_SLOTS,
  VOICE_ARCHETYPES,
  componentsForSlot,
} from "@/lib/vitrine-design";
import { useI18n } from "@/components/i18n-provider";
import { translateActionError } from "./translate-action-error";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";

type EditableCatalog = {
  name: string;
  services: { name: string; duration_min: number; price_cents: number }[];
}[];

export type PublishProps = {
  pageId: string;
  balance: number;
  hasDraft: boolean;
  nextVersion: number;
};

type Props = {
  initialPage: Page;
  initialCatalog: EditableCatalog;
  previewProducts: CategoryWithProducts[];
  previewOffers: Offer[];
  verticalKind: VerticalKind;
  publish: PublishProps;
  sitePages?: SitePage[];
  subpageLimit?: number;
  canHideBranding: boolean;
  // Langue du PROJET (pages.default_locale), pas du dashboard : l'aperçu
  // live doit s'afficher dans la langue de la boutique éditée.
  storefrontDict: StorefrontDict;
};

// Éditeur de vitrine : tout s'enregistre tout seul (autosave débouncé) dans le
// BROUILLON, la préview à droite se met à jour en direct. Le site public ne
// change qu'à la publication d'une nouvelle version (5 crédits). Les produits
// et offres se gèrent sur leurs pages dédiées ; ici ils sont montrés en
// lecture seule dans l'aperçu.
export function PageEditor({
  initialPage,
  initialCatalog,
  previewProducts,
  previewOffers,
  verticalKind,
  publish,
  sitePages = [],
  subpageLimit = 0,
  canHideBranding,
  storefrontDict,
}: Props) {
  const { editor, dictionary, fonts } = useI18n();
  const t = editor.pageEditor;
  const [page, setPage] = useState<Page>(initialPage);
  const [catalogProducts, setCatalogProducts] =
    useState<CategoryWithProducts[]>(previewProducts);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [panelMode, setPanelMode] = useState<"edit" | "preview">("edit");
  const [activeSection, setActiveSection] = useState("identite");
  const [designAdvanced, setDesignAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assistantSaving, setAssistantSaving] = useState(false);
  // Modif locale non publiée : dès qu'on touche un champ, il y a un brouillon.
  const [dirty, setDirty] = useState(publish.hasDraft);
  const appearance = legacyAppearance(page);
  const presentation = resolveStorefrontPresentation(page);

  const showServices = verticalKind !== "product";
  const showShop = verticalKind !== "service";
  const productsByCategory = catalogProducts.filter(
    (category) => category.products.length > 0
  );

  const fieldsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function toggleStorefrontAssistant(enabled: boolean) {
    setAssistantSaving(true);
    setPage((current) => ({ ...current, assistant_enabled: enabled }));
    const result = await setStorefrontAssistantEnabled(page.id, enabled);
    setAssistantSaving(false);
    if (result.error) {
      setPage((current) => ({ ...current, assistant_enabled: !enabled }));
      toast.error(result.error);
      return;
    }
    toast.success(enabled ? "FLUX aidera maintenant les visiteurs." : "L’aide FLUX est désactivée sur la vitrine.");
  }

  const patch = useCallback((fields: Partial<Page>) => {
    setDirty(true);
    setPage((prev) => ({ ...prev, ...fields }));
    if (fieldsTimer.current) clearTimeout(fieldsTimer.current);
    fieldsTimer.current = setTimeout(async () => {
      setSaving(true);
      const result = await savePageFields(initialPage.id, fields);
      setSaving(false);
      if (result.error) toast.error(translateActionError(editor.actionErrors, result.error));
    }, 800);
  }, [initialPage.id, editor.actionErrors]);

  function toggleCatalogItem(productId: string, checked: boolean) {
    setSaving(true);
    setCatalogProducts((prev) =>
      prev.map((category) => ({
        ...category,
        products: category.products.map((product) =>
          product.id === productId ? { ...product, active: checked } : product
        ),
      }))
    );
    updateProduct(productId, { active: checked }).then((result) => {
      setSaving(false);
      if (result.error) toast.error(translateActionError(editor.actionErrors, result.error));
    });
  }

  useEffect(
    () => () => {
      if (fieldsTimer.current) clearTimeout(fieldsTimer.current);
    },
    []
  );

  // Bandeau promo : nouveau format objet, fallback sur l'ancien texte `offer`.
  const promo = page.promo ?? { text: page.offer ?? "" };
  const patchPromo = (fields: Partial<NonNullable<Page["promo"]>>) => {
    const next = { ...promo, ...fields };
    if (!next.code?.trim()) delete next.code;
    if (!next.endsAt) delete next.endsAt;
    // `offer: ""` : on migre l'ancien bandeau texte vers `promo` dès la
    // première édition, sinon il resterait affiché en fallback après effacement.
    patch({
      promo: next.text.trim() || next.code || next.endsAt ? next : null,
      offer: "",
    });
  };

  const visibleProductCategories: CategoryWithProducts[] = catalogProducts
    .map((category) => ({
      ...category,
      products: category.products.filter(
        (product) => product.active && product.kind !== "reservation"
      ),
    }))
    .filter((category) => category.products.length > 0);

  const reservationFamilies: FamilyWithServices[] = catalogProducts
    .map((category, fi) => {
      const services = category.products
        .filter((product) => product.active && product.kind === "reservation")
        .map((product, si) => ({
          id: product.id,
          product_id: product.id,
          family_id: category.id,
          page_id: page.id,
          name: product.name,
          duration_min: product.duration_min || 60,
          price_cents: product.price_cents,
          position: si,
        }));
      return {
        id: category.id,
        product_category_id: category.id,
        page_id: page.id,
        name: category.name,
        position: fi,
        services,
      };
    })
    .filter((family) => family.services.length > 0);

  const legacyFamilies: FamilyWithServices[] = initialCatalog.map((f, fi) => ({
    id: `preview-legacy-f${fi}`,
    product_category_id: null,
    page_id: page.id,
    name: f.name,
    position: fi,
    services: f.services.map((s, si) => ({
      id: `preview-legacy-s${fi}-${si}`,
      product_id: null,
      family_id: `preview-legacy-f${fi}`,
      page_id: page.id,
      name: s.name,
      duration_min: s.duration_min,
      price_cents: s.price_cents,
      position: si,
    })),
  }));
  const previewFamilies =
    reservationFamilies.length > 0 ? reservationFamilies : legacyFamilies;

  return (
    <>
      <div className={styles.mobileSwitch} aria-label={t.editorMode}>
        <button className={panelMode === "edit" ? styles.active : ""} type="button" onClick={() => setPanelMode("edit")}>
          {t.settingsTab}
        </button>
        <button className={panelMode === "preview" ? styles.active : ""} type="button" onClick={() => setPanelMode("preview")}>
          {t.previewTab}
        </button>
      </div>

      <section className={styles.royalHero}>
        <span className={styles.overline}>
          <Crown aria-hidden="true" />
          {t.heroKicker}
        </span>
        <div className={styles.heroMark} aria-hidden="true">
          <Gem />
        </div>
        <h1>
          {t.heroTitleStart} <span>{t.heroTitleEm}</span>
        </h1>
        <p>{t.heroText}</p>
        <div className={styles.heroActions}>
          <div className={styles.saveStatus} data-saving={saving}>
            <span />
            {saving ? t.saving : dirty ? t.unpublished : t.upToDate}
          </div>
          <PublishButton {...publish} hasDraft={dirty} />
          <Button asChild variant="secondary" className={styles.openPage}>
            <Link href={`/p/${page.slug}`} target="_blank">
              {t.viewPage} <ExternalLink aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      <div className={styles.editor}>
      <div className={`${styles.panel} ${panelMode === "preview" ? styles.panelHidden : ""} space-y-4`}>
        {subpageLimit > 0 && (
          <PagesBar
            pageId={page.id}
            sitePages={sitePages}
            activeSitePageId={null}
            limit={subpageLimit}
          />
        )}
        <div className={styles.atelierHead}>
          <div>
            <p className={styles.editorKicker}>{t.creatorKicker}</p>
            <h2>{t.creatorTitle}</h2>
            <p>{t.creatorText}</p>
          </div>
          <span>
            <Palette aria-hidden="true" />
            {t.liveDraft}
          </span>
        </div>

        <nav className={styles.stepNav} aria-label={t.stepsAria}>
          {[
            ["identite", "1", t.steps.identite],
            ["photos", "2", t.steps.photos],
            ["style", "3", t.steps.style],
            [showServices ? "prestations" : "boutique", "4", showServices ? t.steps.prestations : t.steps.boutique],
            ["contact", "5", t.steps.contact],
            ["sections", "6", t.steps.sections],
          ].map(([value, number, label]) => (
            <button
              key={value}
              type="button"
              className={activeSection === value ? styles.stepActive : ""}
              onClick={() => setActiveSection(value)}
            >
              <span>{number}</span>{label}
            </button>
          ))}
        </nav>

        <Accordion
          type="single"
          collapsible
          value={activeSection}
          onValueChange={setActiveSection}
          className={styles.sectionList}
        >
          {/* Identité */}
          <AccordionItem value="identite" className="border rounded-xl px-4">
            <AccordionTrigger>{t.identite.trigger}</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label>{t.identite.name}</Label>
                <Input
                  value={page.business_name}
                  maxLength={60}
                  onChange={(e) => patch({ business_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.identite.job}</Label>
                <Input
                  value={page.job_title}
                  maxLength={60}
                  onChange={(e) => patch({ job_title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.identite.tagline}</Label>
                <Input
                  value={page.tagline}
                  maxLength={120}
                  placeholder={t.identite.taglinePlaceholder}
                  onChange={(e) => patch({ tagline: e.target.value })}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t.identite.city}</Label>
                  <Input
                    value={page.city}
                    maxLength={60}
                    onChange={(e) => patch({ city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.identite.addressOptional}</Label>
                  <Input
                    value={page.address}
                    maxLength={120}
                    onChange={(e) => patch({ address: e.target.value })}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Photos */}
          <AccordionItem value="photos" className="border rounded-xl px-4">
            <AccordionTrigger>{t.photos.trigger}</AccordionTrigger>
            <AccordionContent className="space-y-5 pt-1">
              <div className="space-y-2">
                <Label>{t.photos.logo}</Label>
                <div className="flex items-center gap-3">
                  <PhotoUpload
                    userId={page.user_id}
                    label={t.photos.chooseLogo}
                    messages={dictionary.photoUpload}
                    onUploaded={(url) => patch({ logo_url: url })}
                  />
                  {page.logo_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => patch({ logo_url: null })}
                    >
                      {t.photos.remove}
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.photos.hero}</Label>
                <div className="flex items-center gap-3">
                  <PhotoUpload
                    userId={page.user_id}
                    label={t.photos.choosePhoto}
                    messages={dictionary.photoUpload}
                    onUploaded={(url) => patch({ hero_url: url })}
                  />
                  {page.hero_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => patch({ hero_url: null })}
                    >
                      {t.photos.remove}
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.photos.heroVideo}</Label>
                <div className="flex items-center gap-3">
                  <PhotoUpload
                    userId={page.user_id}
                    label={t.photos.chooseVideo}
                    accept="video/mp4,video/webm"
                    maxMb={50}
                    messages={dictionary.photoUpload}
                    onUploaded={(url) => patch({ hero_video_url: url })}
                  />
                  {page.hero_video_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => patch({ hero_video_url: null })}
                    >
                      {t.photos.remove}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{t.photos.videoHint}</p>
              </div>
              <div className="space-y-2">
                <Label>{t.photos.gallery}</Label>
                <PhotoUpload
                  userId={page.user_id}
                  label={t.photos.addPhotos}
                  multiple
                  messages={dictionary.photoUpload}
                  onUploaded={(url) =>
                    patch({ gallery: [...page.gallery, { url }] })
                  }
                />
                {page.gallery.length > 0 && (
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {page.gallery.map((photo, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="truncate flex-1">
                          {t.photos.photoLabel.replace("{index}", String(i + 1))}
                        </span>
                        <button
                          type="button"
                          className="text-destructive text-xs"
                          onClick={() =>
                            patch({
                              gallery: page.gallery.filter((_, j) => j !== i),
                            })
                          }
                        >
                          {t.photos.removePhoto}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Prestations */}
          {showServices && (
          <AccordionItem value="prestations" className="border rounded-xl px-4">
            <AccordionTrigger>{t.prestations.trigger}</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1">
              {productsByCategory.length > 0 ? (
                productsByCategory.map((category) => (
                  <div key={category.id} className="rounded-lg border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{category.name}</p>
                      <span className="text-xs text-muted-foreground">
                        {(category.products.length > 1
                          ? t.prestations.productCountPlural
                          : t.prestations.productCount
                        ).replace("{count}", String(category.products.length))}
                      </span>
                    </div>
                    <div className={styles.productPicker}>
                      {category.products.map((product) => {
                        const checked = product.active;
                        return (
                          <label key={product.id} className={styles.productChoice}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                toggleCatalogItem(product.id, e.target.checked)
                              }
                            />
                            <span>
                              <strong>{product.name}</strong>
                              <small>
                                {product.kind === "reservation"
                                  ? t.prestations.reservation.replace(
                                      "{duration}",
                                      String(product.duration_min || 60)
                                    )
                                  : t.prestations.product}
                                {(product.price_cents / 100).toFixed(2).replace(".", ",")} €
                              </small>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <p className="text-sm text-muted-foreground">{t.prestations.empty}</p>
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/produits">{t.prestations.manageProducts}</Link>
                  </Button>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
          )}

          {/* Produits & offres — gérés sur leurs pages dédiées */}
          {showShop && (
          <AccordionItem value="boutique" className="border rounded-xl px-4">
            <AccordionTrigger>{t.boutique.trigger}</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-1">
              <p className="text-sm text-muted-foreground">{t.boutique.text}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link href="/produits">{t.boutique.manageProducts}</Link>
                </Button>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/offres">{t.boutique.manageOffers}</Link>
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* Contact */}
          <AccordionItem value="contact" className="border rounded-xl px-4">
            <AccordionTrigger>{t.contact.trigger}</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label>{t.contact.phone}</Label>
                <Input
                  value={page.phone}
                  maxLength={20}
                  onChange={(e) => {
                    const phone = e.target.value;
                    const syncFloatingNumber =
                      page.floating_cta &&
                      (!page.floating_cta.number || page.floating_cta.number === page.phone);
                    patch({
                      phone,
                      ...(syncFloatingNumber
                        ? { floating_cta: { ...page.floating_cta!, number: phone } }
                        : {}),
                    });
                  }}
                />
              </div>
              {(["instagram", "tiktok", "facebook", "snapchat"] as const).map(
                (network) => (
                  <div key={network} className="space-y-2">
                    <Label className="capitalize">
                      {t.contact.socialOptional.replace("{network}", network)}
                    </Label>
                    <Input
                      value={page.socials[network] ?? ""}
                      maxLength={80}
                      onChange={(e) =>
                        patch({
                          socials: { ...page.socials, [network]: e.target.value },
                        })
                      }
                    />
                  </div>
                )
              )}
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>{t.contact.floatingCta}</Label>
                    <p className="text-xs text-muted-foreground">{t.contact.floatingCtaHint}</p>
                  </div>
                  <Switch
                    checked={Boolean(page.floating_cta)}
                    onCheckedChange={(on) =>
                      patch({
                        floating_cta: on
                          ? { type: "whatsapp", number: page.phone || "" }
                          : null,
                      })
                    }
                  />
                </div>
                {page.floating_cta && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{t.contact.type}</Label>
                      <Select
                        value={page.floating_cta.type}
                        onValueChange={(type) =>
                          patch({
                            floating_cta: {
                              ...page.floating_cta!,
                              type: type as "whatsapp" | "phone",
                            },
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">{t.contact.whatsapp}</SelectItem>
                          <SelectItem value="phone">{t.contact.directCall}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.contact.number}</Label>
                      <Input
                        value={page.floating_cta.number}
                        maxLength={20}
                        placeholder={t.contact.numberPlaceholder}
                        onChange={(e) =>
                          patch({
                            floating_cta: {
                              ...page.floating_cta!,
                              number: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t.contact.hours}</Label>
                <Textarea
                  value={page.hours_text}
                  rows={4}
                  className={styles.longText}
                  maxLength={400}
                  placeholder={t.contact.hoursPlaceholder}
                  onChange={(e) => patch({ hours_text: e.target.value })}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Style */}
          <AccordionItem value="style" className="border rounded-xl px-4">
            <AccordionTrigger>{t.style.trigger}</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label>{t.style.ambiance}</Label>
                <div className={styles.themeGrid}>
                  {VITRINE_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => patch(designKitPatch(theme.id, page))}
                      data-theme={theme.id}
                      className={(page.theme || "editorial") === theme.id ? styles.themeActive : styles.themeChoice}
                    >
                      <span className={styles.themePreview}><i /><i /><i /></span>
                      <strong>
                        {theme.name}
                        {theme.premium && <em className={styles.themePremium}>{t.style.premium}</em>}
                      </strong>
                      <small>{theme.description}</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{t.style.libraryTitle}</p>
                    <p className="text-xs text-muted-foreground">{t.style.libraryText}</p>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setDesignAdvanced((value) => !value)}>
                    {designAdvanced ? t.style.simpleMode : t.style.customize}
                  </Button>
                </div>
                <Select
                  value={page.design?.kitId ?? "auto"}
                  onValueChange={(kitId) => {
                    if (kitId === "auto") return patch({ design: null });
                    patch(designKitPatch(kitId, page));
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t.style.autoKit}</SelectItem>
                    {DESIGN_KITS.map((kit) => <SelectItem key={kit.id} value={kit.id}>{kit.name}{kit.premium ? ` · ${t.style.premium}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
                {designAdvanced && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {DESIGN_SLOTS.map((slot) => {
                      const kitId = page.design?.kitId ?? page.theme ?? "editorial";
                      const kit = DESIGN_KITS.find((entry) => entry.id === kitId) ?? DESIGN_KITS[0];
                      const value = page.design?.components?.[slot] ?? kit.components[slot];
                      const entries = componentsForSlot(slot, kitId);
                      return (
                        <div key={slot} className="space-y-1.5">
                          <Label>{t.designSlots[slot]}</Label>
                          {entries.length > 1 ? (
                            <Select value={value} onValueChange={(id) => patch({ design: { kitId, voiceArchetypeId: page.design?.voiceArchetypeId, components: { ...page.design?.components, [slot]: id } } })}>
                              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>{entries.map((entry) => <SelectItem key={entry.id} value={entry.id}>{entry.name}</SelectItem>)}</SelectContent>
                            </Select>
                          ) : (
                            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                              {entries[0]?.name ?? t.style.includedInKit}
                              <span className="mt-0.5 block text-[10px]">{t.style.onlyVariant}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>{t.style.editorialVoice}</Label>
                      <Select
                        value={page.design?.voiceArchetypeId ?? (DESIGN_KITS.find((entry) => entry.id === (page.design?.kitId ?? page.theme)) ?? DESIGN_KITS[0]).voiceArchetypeId}
                        onValueChange={(voiceArchetypeId) => patch({ design: { kitId: page.design?.kitId ?? page.theme ?? "editorial", components: page.design?.components, voiceArchetypeId } })}
                      >
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>{VOICE_ARCHETYPES.map((voice) => <SelectItem key={voice.id} value={voice.id}>{voice.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">Couleurs cohérentes</p>
                <div className={styles.colorGrid}>
                  <div className="space-y-2">
                    <Label>{t.style.colorPrimary}</Label>
                    <input
                      type="color"
                      value={appearance.accent}
                      className="h-10 w-full rounded-lg border border-border bg-transparent cursor-pointer"
                      onChange={(event) => patch({ appearance: { ...appearance, accent: event.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ambiance</Label>
                    <Select
                      value={appearance.mode}
                      disabled={presentation.kit.supportedModes.length < 2}
                      onValueChange={(mode) => patch({ appearance: { ...appearance, mode: mode as "light" | "dark" } })}
                    >
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {presentation.kit.supportedModes.includes("light") && <SelectItem value="light">Claire</SelectItem>}
                        {presentation.kit.supportedModes.includes("dark") && <SelectItem value="dark">Sombre</SelectItem>}
                      </SelectContent>
                    </Select>
                    {presentation.kit.supportedModes.length < 2 && (
                      <p className="text-xs text-muted-foreground">Cet univers n’existe qu’en ambiance {presentation.kit.supportedModes[0] === "dark" ? "sombre" : "claire"}.</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Choix clair/sombre pour les visiteurs</Label>
                    <p className="text-xs text-muted-foreground">Affiche le bouton de changement d’ambiance sur la vitrine.</p>
                  </div>
                  <Switch
                    checked={appearance.allowVisitorModeToggle}
                    onCheckedChange={(allowVisitorModeToggle) =>
                      patch({ appearance: { ...appearance, allowVisitorModeToggle } })
                    }
                  />
                </div>
                {presentation.warnings.includes("accent_contrast_adjusted") && (
                  <p role="status" className="text-xs text-amber-500">
                    Cette couleur est légèrement adaptée dans l’aperçu pour garantir la lisibilité.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Les fonds, textes, bordures et boutons sont calculés automatiquement à partir de ces choix.
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t.style.writingStyle}</Label>
                <Select value={page.font} onValueChange={(font) => patch({ font })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fonts.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{t.style.headingsTitle}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t.style.headingFont}</Label>
                    <Select
                      value={page.typography?.headingFont ?? "same"}
                      onValueChange={(headingFont) =>
                        patch({
                          typography: {
                            ...page.typography,
                            headingFont:
                              headingFont === "same" ? undefined : headingFont,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="same">{t.style.sameAsPage}</SelectItem>
                        {fonts.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.style.headingScale}</Label>
                    <Select
                      value={page.typography?.headingScale ?? "m"}
                      onValueChange={(headingScale) =>
                        patch({
                          typography: {
                            ...page.typography,
                            headingScale:
                              headingScale === "m"
                                ? undefined
                                : (headingScale as "s" | "l" | "xl"),
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="s">{t.style.scaleSmall}</SelectItem>
                        <SelectItem value="m">{t.style.scaleNormal}</SelectItem>
                        <SelectItem value="l">{t.style.scaleLarge}</SelectItem>
                        <SelectItem value="xl">{t.style.scaleXl}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Sections de la page */}
          <AccordionItem value="sections" className="border rounded-xl px-4">
            <AccordionTrigger>{t.sectionsAccordion}</AccordionTrigger>
            <AccordionContent className="pt-1">
              <SectionsPanel
                sections={resolveSections(page)}
                userId={page.user_id}
                pageAddress={page.address}
                onChange={(sections) => patch({ sections })}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Menu de navigation & boutons */}
          <AccordionItem value="menu" className="border rounded-xl px-4">
            <AccordionTrigger>{t.menuAccordion}</AccordionTrigger>
            <AccordionContent className="pt-1">
              <NavigationPanel page={page} sitePages={sitePages} patch={patch} />
            </AccordionContent>
          </AccordionItem>

          {/* Avis */}
          <AccordionItem value="avis" className="border rounded-xl px-4">
            <AccordionTrigger>{t.avis.trigger}</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-1">
              <p className="text-sm text-muted-foreground">{t.avis.text}</p>
              {page.reviews.map((review, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                  <Input
                    value={review.author}
                    maxLength={40}
                    placeholder={t.avis.authorPlaceholder}
                    onChange={(e) => {
                      const reviews = [...page.reviews];
                      reviews[i] = { ...reviews[i], author: e.target.value };
                      patch({ reviews });
                    }}
                  />
                  <Textarea
                    value={review.text}
                    rows={2}
                    className={styles.longText}
                    maxLength={300}
                    placeholder={t.avis.textPlaceholder}
                    onChange={(e) => {
                      const reviews = [...page.reviews];
                      reviews[i] = { ...reviews[i], text: e.target.value };
                      patch({ reviews });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      patch({ reviews: page.reviews.filter((_, j) => j !== i) })
                    }
                  >
                    {t.avis.remove}
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  patch({ reviews: [...page.reviews, { author: "", text: "" }] })
                }
              >
                {t.avis.add}
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* Offre */}
          <AccordionItem value="offre" className="border rounded-xl px-4">
            <AccordionTrigger>{t.offre.trigger}</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label>{t.offre.message}</Label>
                <Input
                  value={promo.text}
                  maxLength={100}
                  placeholder={t.offre.messagePlaceholder}
                  onChange={(e) => patchPromo({ text: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">{t.offre.messageHint}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t.offre.codeOptional}</Label>
                  <Input
                    value={promo.code ?? ""}
                    maxLength={24}
                    placeholder={t.offre.codePlaceholder}
                    onChange={(e) =>
                      patchPromo({ code: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.offre.endsAtOptional}</Label>
                  <Input
                    type="datetime-local"
                    value={promo.endsAt ? promo.endsAt.slice(0, 16) : ""}
                    onChange={(e) =>
                      patchPromo({
                        endsAt: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : undefined,
                      })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t.offre.hint}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Référencement & visibilité */}
          <AccordionItem value="seo" className="border rounded-xl px-4">
            <AccordionTrigger>{t.seo.trigger}</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label>
                  {t.seo.googleTitle.replace("{count}", String((page.seo?.title ?? "").length))}
                </Label>
                <Input
                  value={page.seo?.title ?? ""}
                  maxLength={60}
                  placeholder={t.seo.googleTitlePlaceholder}
                  onChange={(e) =>
                    patch({ seo: { ...page.seo, title: e.target.value } })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {t.seo.googleDescription.replace(
                    "{count}",
                    String((page.seo?.description ?? "").length)
                  )}
                </Label>
                <Textarea
                  value={page.seo?.description ?? ""}
                  rows={3}
                  className={styles.longText}
                  maxLength={160}
                  placeholder={t.seo.googleDescriptionPlaceholder}
                  onChange={(e) =>
                    patch({ seo: { ...page.seo, description: e.target.value } })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t.seo.shareImage}</Label>
                <div className="flex items-center gap-3">
                  <PhotoUpload
                    userId={page.user_id}
                    label={page.seo?.ogImageUrl ? t.seo.changeImage : t.seo.chooseImage}
                    messages={dictionary.photoUpload}
                    onUploaded={(url) =>
                      patch({ seo: { ...page.seo, ogImageUrl: url } })
                    }
                  />
                  {page.seo?.ogImageUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const seo = { ...page.seo };
                        delete seo.ogImageUrl;
                        patch({ seo });
                      }}
                    >
                      {t.photos.remove}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{t.seo.shareImageHint}</p>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <Label>{t.seo.hideBranding}</Label>
                  <p
                    id={!canHideBranding ? "branding-entitlement-help" : undefined}
                    className="text-xs text-muted-foreground"
                  >
                    {canHideBranding ? t.seo.hideBrandingAllowed : t.seo.hideBrandingRestricted}
                  </p>
                  {!canHideBranding && (
                    <div className="mt-2 text-xs">
                      <Link className="text-primary underline underline-offset-4" href="/formules">
                        {t.seo.discoverEnterprise}
                      </Link>
                    </div>
                  )}
                </div>
                <Switch
                  checked={canHideBranding && (page.hide_branding ?? false)}
                  disabled={!canHideBranding}
                  aria-label={t.seo.hideBrandingAria}
                  aria-describedby={!canHideBranding ? "branding-entitlement-help" : undefined}
                  onCheckedChange={(hide_branding) => patch({ hide_branding })}
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="flex items-start gap-3">
                  <Bot className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                  <div>
                    <Label>Assistant FLUX pour mes visiteurs</Label>
                    <p className="text-xs text-muted-foreground">
                      Ajoute une aide discrète pour trouver tes produits, tes offres,
                      la réservation et tes coordonnées. Aucun crédit n’est utilisé.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={page.assistant_enabled ?? false}
                  disabled={assistantSaving}
                  aria-label="Afficher l’assistant FLUX sur ma vitrine"
                  onCheckedChange={toggleStorefrontAssistant}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Légal */}
          <AccordionItem value="legal" className="border rounded-xl px-4">
            <AccordionTrigger>{t.legal.trigger}</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">{t.legal.text}</p>
              {page.default_locale !== "fr" &&
                Object.values(page.legal ?? {}).every((value) => !value?.trim()) && (
                  <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-600">
                    {t.legal.needsLocalReview}
                  </p>
                )}
              {(
                [
                  ["mentions", t.legal.mentions],
                  ["cgv", t.legal.cgv],
                  ["confidentialite", t.legal.confidentialite],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Textarea
                    value={page.legal[key] ?? ""}
                    rows={5}
                    className={styles.longText}
                    onChange={(e) =>
                      patch({ legal: { ...page.legal, [key]: e.target.value } })
                    }
                  />
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>

          {/* Langues */}
          <AccordionItem value="languages" className="border rounded-xl px-4">
            <AccordionTrigger>{t.languages.trigger}</AccordionTrigger>
            <AccordionContent className="pt-1">
              <LanguageManager
                page={page}
                balance={publish.balance}
                t={t.languages}
                onLocalesChange={(enabledLocales) => setPage((prev) => ({ ...prev, enabled_locales: enabledLocales }))}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Préview live */}
      <div className={`${styles.previewPanel} ${panelMode === "edit" ? styles.panelHidden : ""}`}>
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
        <div className={`${styles.device} ${previewMode === "mobile" ? styles.deviceMobile : styles.deviceDesktop}`}>
          <div className={styles.deviceScreen}>
            <VitrineView
              page={page}
              families={previewFamilies}
              productCategories={visibleProductCategories}
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
