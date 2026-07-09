"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Offer, Page } from "@/lib/types";
import { FONTS, type VerticalKind } from "@/lib/verticals";
import { VITRINE_THEMES } from "@/lib/vitrine-themes";
import {
  savePageFields,
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
import { Crown, ExternalLink, Gem, Palette } from "lucide-react";
import styles from "./page-editor-redesign.module.css";

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
}: Props) {
  const [page, setPage] = useState<Page>(initialPage);
  const [catalogProducts, setCatalogProducts] =
    useState<CategoryWithProducts[]>(previewProducts);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [panelMode, setPanelMode] = useState<"edit" | "preview">("edit");
  const [activeSection, setActiveSection] = useState("identite");
  const [saving, setSaving] = useState(false);
  // Modif locale non publiée : dès qu'on touche un champ, il y a un brouillon.
  const [dirty, setDirty] = useState(publish.hasDraft);

  const showServices = verticalKind !== "product";
  const showShop = verticalKind !== "service";
  const productsByCategory = catalogProducts.filter(
    (category) => category.products.length > 0
  );

  const fieldsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patch = useCallback((fields: Partial<Page>) => {
    setDirty(true);
    setPage((prev) => ({ ...prev, ...fields }));
    if (fieldsTimer.current) clearTimeout(fieldsTimer.current);
    fieldsTimer.current = setTimeout(async () => {
      setSaving(true);
      const result = await savePageFields(initialPage.id, fields);
      setSaving(false);
      if (result.error) toast.error(result.error);
    }, 800);
  }, [initialPage.id]);

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
      if (result.error) toast.error(result.error);
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
      <div className={styles.mobileSwitch} aria-label="Mode de l’éditeur">
        <button className={panelMode === "edit" ? styles.active : ""} type="button" onClick={() => setPanelMode("edit")}>
          Réglages
        </button>
        <button className={panelMode === "preview" ? styles.active : ""} type="button" onClick={() => setPanelMode("preview")}>
          Aperçu
        </button>
      </div>

      <section className={styles.royalHero}>
        <span className={styles.overline}>
          <Crown aria-hidden="true" />
          Atelier royal
        </span>
        <div className={styles.heroMark} aria-hidden="true">
          <Gem />
        </div>
        <h1>
          Façonne ta <span>marque</span>
        </h1>
        <p>
          Ici, tu crées ta signature: ton nom, tes images, tes couleurs, tes
          preuves et ton univers. Chaque section mérite ton attention, parce que
          ta vitrine devient ton royaume.
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
          <PublishButton {...publish} hasDraft={dirty} />
          <Button asChild variant="secondary" className={styles.openPage}>
            <Link href={`/p/${page.slug}`} target="_blank">
              Voir ma page <ExternalLink aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      <div className={styles.editor}>
      <div className={`${styles.panel} ${panelMode === "preview" ? styles.panelHidden : ""} space-y-4`}>
        <div className={styles.atelierHead}>
          <div>
            <p className={styles.editorKicker}>Créateur de vitrine</p>
            <h2>Les pièces de ton royaume</h2>
            <p>
              Avance pièce par pièce. Chaque bloc a son rôle: poser ton identité,
              montrer ton savoir-faire, rassurer, puis donner envie de te choisir.
            </p>
          </div>
          <span>
            <Palette aria-hidden="true" />
            Brouillon vivant
          </span>
        </div>

        <nav className={styles.stepNav} aria-label="Étapes de personnalisation">
          {[
            ["identite", "1", "Identité"],
            ["photos", "2", "Photos"],
            ["style", "3", "Style"],
            [showServices ? "prestations" : "boutique", "4", showServices ? "Prestations" : "Produits"],
            ["contact", "5", "Contact"],
            ["sections", "6", "Sections"],
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
            <AccordionTrigger>Mon commerce — nom, métier, ville</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label>Le nom</Label>
                <Input
                  value={page.business_name}
                  maxLength={60}
                  onChange={(e) => patch({ business_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ton métier (s&apos;affiche sous le nom)</Label>
                <Input
                  value={page.job_title}
                  maxLength={60}
                  onChange={(e) => patch({ job_title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ta phrase (celle qui te ressemble)</Label>
                <Input
                  value={page.tagline}
                  maxLength={120}
                  placeholder="Ex : Votre voiture comme neuve, sans rendez-vous interminable."
                  onChange={(e) => patch({ tagline: e.target.value })}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input
                    value={page.city}
                    maxLength={60}
                    onChange={(e) => patch({ city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adresse (facultatif)</Label>
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
            <AccordionTrigger>Mes photos — logo, grande photo, galerie</AccordionTrigger>
            <AccordionContent className="space-y-5 pt-1">
              <div className="space-y-2">
                <Label>Ton logo ou une photo de toi</Label>
                <div className="flex items-center gap-3">
                  <PhotoUpload
                    userId={page.user_id}
                    label="Choisir mon logo"
                    onUploaded={(url) => patch({ logo_url: url })}
                  />
                  {page.logo_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => patch({ logo_url: null })}
                    >
                      Retirer
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>La grande photo du haut de ta page</Label>
                <div className="flex items-center gap-3">
                  <PhotoUpload
                    userId={page.user_id}
                    label="Choisir ma photo"
                    onUploaded={(url) => patch({ hero_url: url })}
                  />
                  {page.hero_url && (
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
              <div className="space-y-2">
                <Label>Une vidéo d&apos;accueil (à la place de la photo)</Label>
                <div className="flex items-center gap-3">
                  <PhotoUpload
                    userId={page.user_id}
                    label="Choisir ma vidéo"
                    accept="video/mp4,video/webm"
                    maxMb={50}
                    onUploaded={(url) => patch({ hero_video_url: url })}
                  />
                  {page.hero_video_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => patch({ hero_video_url: null })}
                    >
                      Retirer
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Courte et sans son, c&apos;est elle qui tourne en haut de ta page.
                  Ta photo sert d&apos;image d&apos;attente.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Tes plus belles réalisations (galerie)</Label>
                <PhotoUpload
                  userId={page.user_id}
                  label="Ajouter des photos"
                  multiple
                  onUploaded={(url) =>
                    patch({ gallery: [...page.gallery, { url }] })
                  }
                />
                {page.gallery.length > 0 && (
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {page.gallery.map((photo, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="truncate flex-1">Photo {i + 1}</span>
                        <button
                          type="button"
                          className="text-destructive text-xs"
                          onClick={() =>
                            patch({
                              gallery: page.gallery.filter((_, j) => j !== i),
                            })
                          }
                        >
                          retirer
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
            <AccordionTrigger>Mes prestations — produits et réservations</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1">
              {productsByCategory.length > 0 ? (
                productsByCategory.map((category) => (
                  <div key={category.id} className="rounded-lg border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{category.name}</p>
                      <span className="text-xs text-muted-foreground">
                        {category.products.length} produit{category.products.length > 1 ? "s" : ""}
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
                                  ? `Réservation · ${product.duration_min || 60} min · `
                                  : "Produit · "}
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
                  <p className="text-sm text-muted-foreground">
                    Ajoute d&apos;abord tes produits ou tes réservations. Ils seront
                    cochés automatiquement ici et visibles sur ta vitrine.
                  </p>
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/produits">Gérer mes produits →</Link>
                  </Button>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
          )}

          {/* Produits & offres — gérés sur leurs pages dédiées */}
          {showShop && (
          <AccordionItem value="boutique" className="border rounded-xl px-4">
            <AccordionTrigger>Mes produits & offres</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-1">
              <p className="text-sm text-muted-foreground">
                Tes produits (stock, chiffre d&apos;affaires) et tes offres promo se
                gèrent sur leurs pages dédiées. Ils apparaissent tout de suite dans
                l&apos;aperçu de ta vitrine.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link href="/produits">Gérer mes produits →</Link>
                </Button>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/offres">Gérer mes offres →</Link>
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* Contact */}
          <AccordionItem value="contact" className="border rounded-xl px-4">
            <AccordionTrigger>Me contacter — téléphone, réseaux</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label>Ton téléphone</Label>
                <Input
                  value={page.phone}
                  maxLength={20}
                  onChange={(e) => patch({ phone: e.target.value })}
                />
              </div>
              {(["instagram", "tiktok", "facebook", "snapchat"] as const).map(
                (network) => (
                  <div key={network} className="space-y-2">
                    <Label className="capitalize">{network} (facultatif)</Label>
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
                    <Label>Bouton flottant de contact</Label>
                    <p className="text-xs text-muted-foreground">
                      Un bouton toujours visible en bas de ta page pour t&apos;écrire
                      ou t&apos;appeler.
                    </p>
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
                      <Label>Type</Label>
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
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="phone">Appel direct</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Numéro</Label>
                      <Input
                        value={page.floating_cta.number}
                        maxLength={20}
                        placeholder="+33 6 12 34 56 78"
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
                <Label>Tes horaires affichés (facultatif, une ligne par jour)</Label>
                <Textarea
                  value={page.hours_text}
                  rows={4}
                  className={styles.longText}
                  maxLength={400}
                  placeholder={"Mar-Ven : 9h - 19h\nSam : 9h - 17h"}
                  onChange={(e) => patch({ hours_text: e.target.value })}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Style */}
          <AccordionItem value="style" className="border rounded-xl px-4">
            <AccordionTrigger>Le style — couleurs et écriture</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label>Ambiance de ta vitrine</Label>
                <div className={styles.themeGrid}>
                  {VITRINE_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => patch({ theme: theme.id })}
                      data-theme={theme.id}
                      className={(page.theme || "editorial") === theme.id ? styles.themeActive : styles.themeChoice}
                    >
                      <span className={styles.themePreview}><i /><i /><i /></span>
                      <strong>
                        {theme.name}
                        {theme.premium && <em className={styles.themePremium}>Premium</em>}
                      </strong>
                      <small>{theme.description}</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.colorGrid}>
                {(
                  [
                    ["primary", "Principale"],
                    ["dark", "Foncée"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <input
                      type="color"
                      value={page.colors[key] ?? "#d31212"}
                      className="h-10 w-full rounded-lg border border-border bg-transparent cursor-pointer"
                      onChange={(e) =>
                        patch({ colors: { ...page.colors, [key]: e.target.value } })
                      }
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                La principale colore tes boutons et tes prix. La foncée habille le
                bas de ta page. Les textes s&apos;adaptent automatiquement pour rester lisibles.
              </p>
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">Couleurs avancées</p>
                <div className={styles.colorGrid}>
                  {(
                    [
                      ["background", "Fond de page", "#f1ede7"],
                      ["card", "Cartes", "#e7e1da"],
                    ] as const
                  ).map(([key, label, fallback]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{label}</Label>
                        {page.colors[key] && (
                          <button
                            type="button"
                            className="text-xs text-muted-foreground underline underline-offset-2"
                            onClick={() => {
                              const rest = { ...page.colors };
                              delete rest[key];
                              patch({ colors: rest });
                            }}
                          >
                            auto
                          </button>
                        )}
                      </div>
                      <input
                        type="color"
                        value={page.colors[key] ?? fallback}
                        className="h-10 w-full rounded-lg border border-border bg-transparent cursor-pointer"
                        onChange={(e) =>
                          patch({ colors: { ...page.colors, [key]: e.target.value } })
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Dégradé en haut de page</Label>
                    <p className="text-xs text-muted-foreground">
                      Sans photo ni vidéo, le haut mélange ta couleur foncée et ta
                      couleur principale.
                    </p>
                  </div>
                  <Switch
                    checked={page.colors.heroGradient ?? false}
                    onCheckedChange={(heroGradient) =>
                      patch({ colors: { ...page.colors, heroGradient } })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ton style d&apos;écriture</Label>
                <Select value={page.font} onValueChange={(font) => patch({ font })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONTS.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Sections de la page */}
          <AccordionItem value="sections" className="border rounded-xl px-4">
            <AccordionTrigger>Les sections de ma page — ordre et blocs</AccordionTrigger>
            <AccordionContent className="pt-1">
              <SectionsPanel
                sections={resolveSections(page)}
                userId={page.user_id}
                onChange={(sections) => patch({ sections })}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Avis */}
          <AccordionItem value="avis" className="border rounded-xl px-4">
            <AccordionTrigger>Les avis de tes clients</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-1">
              <p className="text-sm text-muted-foreground">
                Recopie les avis que tu as déjà reçus (Google, Instagram, SMS).
                Si tu n&apos;en mets aucun, la section n&apos;apparaît pas.
              </p>
              {page.reviews.map((review, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                  <Input
                    value={review.author}
                    maxLength={40}
                    placeholder="Prénom du client"
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
                    placeholder="Son avis"
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
                    Retirer
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
                + Ajouter un avis
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* Offre */}
          <AccordionItem value="offre" className="border rounded-xl px-4">
            <AccordionTrigger>Une offre à mettre en avant</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label>Ton message</Label>
                <Input
                  value={promo.text}
                  maxLength={100}
                  placeholder="Ex : -20% pour toute première visite en janvier"
                  onChange={(e) => patchPromo({ text: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  S&apos;affiche en bandeau tout en haut de ta page. Facultatif.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Code promo (facultatif)</Label>
                  <Input
                    value={promo.code ?? ""}
                    maxLength={24}
                    placeholder="Ex : BIENVENUE20"
                    onChange={(e) =>
                      patchPromo({ code: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fin de l&apos;offre (facultatif)</Label>
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
              <p className="text-xs text-muted-foreground">
                Avec une date de fin, un compte à rebours s&apos;affiche et le
                bandeau disparaît tout seul à l&apos;échéance. Le code se copie en
                un clic.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Référencement & visibilité */}
          <AccordionItem value="seo" className="border rounded-xl px-4">
            <AccordionTrigger>Référencement (SEO) & visibilité</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label>
                  Titre Google ({(page.seo?.title ?? "").length}/60)
                </Label>
                <Input
                  value={page.seo?.title ?? ""}
                  maxLength={60}
                  placeholder="Ex : Barbier à Lyon 3 — Chez Marco"
                  onChange={(e) =>
                    patch({ seo: { ...page.seo, title: e.target.value } })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Description Google ({(page.seo?.description ?? "").length}/160)
                </Label>
                <Textarea
                  value={page.seo?.description ?? ""}
                  rows={3}
                  className={styles.longText}
                  maxLength={160}
                  placeholder="La phrase qui donne envie de cliquer dans les résultats de recherche."
                  onChange={(e) =>
                    patch({ seo: { ...page.seo, description: e.target.value } })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Image de partage (réseaux, WhatsApp…)</Label>
                <div className="flex items-center gap-3">
                  <PhotoUpload
                    userId={page.user_id}
                    label={page.seo?.ogImageUrl ? "Changer l'image" : "Choisir une image"}
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
                      Retirer
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Par défaut, ta grande photo du haut de page est utilisée.
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <Label>Masquer « Créé avec Wayne Web Flux »</Label>
                  <p className="text-xs text-muted-foreground">
                    Retire la signature en bas de ta page publique.
                  </p>
                </div>
                <Switch
                  checked={page.hide_branding ?? false}
                  onCheckedChange={(hide_branding) => patch({ hide_branding })}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Légal */}
          <AccordionItem value="legal" className="border rounded-xl px-4">
            <AccordionTrigger>Les mentions légales — déjà écrites pour toi</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">
                Tout est déjà rédigé. Quand tu as 2 minutes, remplace les
                [À COMPLÉTER] par tes infos. Rien ne bloque sans.
              </p>
              {(
                [
                  ["mentions", "Mentions légales"],
                  ["cgv", "Conditions de vente"],
                  ["confidentialite", "Confidentialité"],
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
        </Accordion>
      </div>

      {/* Préview live */}
      <div className={`${styles.previewPanel} ${panelMode === "edit" ? styles.panelHidden : ""}`}>
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
        <div className={`${styles.device} ${previewMode === "mobile" ? styles.deviceMobile : styles.deviceDesktop}`}>
          <div className={styles.deviceScreen}>
            <VitrineView
              page={page}
              families={previewFamilies}
              productCategories={visibleProductCategories}
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
