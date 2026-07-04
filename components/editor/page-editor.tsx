"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Page } from "@/lib/types";
import { FONTS } from "@/lib/verticals";
import { VITRINE_THEMES } from "@/lib/vitrine-themes";
import {
  savePageFields,
  syncCatalog,
  type CatalogFamily,
} from "@/app/(app)/ma-page/actions";
import {
  VitrineView,
  type FamilyWithServices,
} from "@/components/vitrine/vitrine-view";
import { PhotoUpload } from "./photo-upload";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import styles from "./page-editor.module.css";

type EditableCatalog = {
  name: string;
  services: { name: string; duration_min: number; price_cents: number }[];
}[];

type Props = {
  initialPage: Page;
  initialCatalog: EditableCatalog;
};

// Éditeur de vitrine : tout s'enregistre tout seul (autosave débouncé),
// la préview à droite se met à jour en direct.
export function PageEditor({ initialPage, initialCatalog }: Props) {
  const [page, setPage] = useState<Page>(initialPage);
  const [catalog, setCatalog] = useState<EditableCatalog>(initialCatalog);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [panelMode, setPanelMode] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);

  const fieldsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catalogTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patch = useCallback((fields: Partial<Page>) => {
    setPage((prev) => ({ ...prev, ...fields }));
    if (fieldsTimer.current) clearTimeout(fieldsTimer.current);
    fieldsTimer.current = setTimeout(async () => {
      setSaving(true);
      const result = await savePageFields(initialPage.id, fields);
      setSaving(false);
      if (result.error) toast.error(result.error);
    }, 800);
  }, [initialPage.id]);

  const patchCatalog = useCallback(
    (next: EditableCatalog) => {
      setCatalog(next);
      if (catalogTimer.current) clearTimeout(catalogTimer.current);
      catalogTimer.current = setTimeout(async () => {
        setSaving(true);
        const result = await syncCatalog(
          initialPage.id,
          next as CatalogFamily[]
        );
        setSaving(false);
        if (result.error) toast.error(result.error);
      }, 1200);
    },
    [initialPage.id]
  );

  useEffect(
    () => () => {
      if (fieldsTimer.current) clearTimeout(fieldsTimer.current);
      if (catalogTimer.current) clearTimeout(catalogTimer.current);
    },
    []
  );

  // Préview : reconstruit des familles avec des ids stables locaux
  const previewFamilies: FamilyWithServices[] = catalog.map((f, fi) => ({
    id: `preview-f${fi}`,
    page_id: page.id,
    name: f.name,
    position: fi,
    services: f.services.map((s, si) => ({
      id: `preview-s${fi}-${si}`,
      family_id: `preview-f${fi}`,
      page_id: page.id,
      name: s.name,
      duration_min: s.duration_min,
      price_cents: s.price_cents,
      position: si,
    })),
  }));

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
      <div className={styles.editor}>
      <div className={`${styles.panel} ${panelMode === "preview" ? styles.panelHidden : ""} space-y-4`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Ma vitrine</h1>
            <p className="text-sm text-muted-foreground">
              Tout s&apos;enregistre tout seul.{" "}
              {saving ? "Enregistrement…" : "À jour."}
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href={`/p/${page.slug}`} target="_blank">
              Voir ma page ↗
            </Link>
          </Button>
        </div>

        <Accordion type="multiple" defaultValue={["identite"]} className="space-y-2">
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
              <div className="grid grid-cols-2 gap-3">
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
          <AccordionItem value="prestations" className="border rounded-xl px-4">
            <AccordionTrigger>Mes prestations — familles, prix, durées</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1">
              {catalog.map((family, fi) => (
                <div key={fi} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={family.name}
                      maxLength={60}
                      className="font-medium"
                      onChange={(e) => {
                        const next = structuredClone(catalog);
                        next[fi].name = e.target.value;
                        patchCatalog(next);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        patchCatalog(catalog.filter((_, j) => j !== fi))
                      }
                    >
                      Supprimer
                    </Button>
                  </div>
                  {family.services.map((service, si) => (
                    <div key={si} className="grid grid-cols-[1fr_78px_86px_auto] gap-2 items-center">
                      <Input
                        value={service.name}
                        maxLength={80}
                        placeholder="Nom de la prestation"
                        onChange={(e) => {
                          const next = structuredClone(catalog);
                          next[fi].services[si].name = e.target.value;
                          patchCatalog(next);
                        }}
                      />
                      <Input
                        type="number"
                        min={5}
                        max={600}
                        step={5}
                        value={service.duration_min}
                        title="Durée (minutes)"
                        onChange={(e) => {
                          const next = structuredClone(catalog);
                          next[fi].services[si].duration_min =
                            parseInt(e.target.value, 10) || 60;
                          patchCatalog(next);
                        }}
                      />
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={service.price_cents / 100}
                        title="Prix (€)"
                        onChange={(e) => {
                          const next = structuredClone(catalog);
                          next[fi].services[si].price_cents = Math.round(
                            (parseFloat(e.target.value) || 0) * 100
                          );
                          patchCatalog(next);
                        }}
                      />
                      <button
                        type="button"
                        aria-label="Retirer la prestation"
                        className="text-destructive text-sm px-1"
                        onClick={() => {
                          const next = structuredClone(catalog);
                          next[fi].services.splice(si, 1);
                          patchCatalog(next);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Nom · durée (min) · prix (€)
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const next = structuredClone(catalog);
                      next[fi].services.push({
                        name: "",
                        duration_min: 60,
                        price_cents: 5000,
                      });
                      patchCatalog(next);
                    }}
                  >
                    + Ajouter une prestation
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                onClick={() =>
                  patchCatalog([
                    ...catalog,
                    { name: "Nouvelle famille", services: [] },
                  ])
                }
              >
                + Ajouter une famille
              </Button>
            </AccordionContent>
          </AccordionItem>

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
              <div className="space-y-2">
                <Label>Tes horaires affichés (facultatif, une ligne par jour)</Label>
                <Textarea
                  value={page.hours_text}
                  rows={4}
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
                <div className="grid sm:grid-cols-2 gap-2">
                  {VITRINE_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => patch({ theme: theme.id })}
                      className={`min-h-20 rounded-2xl border p-3 text-left transition-colors ${
                        (page.theme || "editorial") === theme.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/40"
                      }`}
                    >
                      <strong className="block text-sm">{theme.name}</strong>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {theme.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    ["primary", "Principale"],
                    ["dark", "Foncée"],
                    ["text", "Écriture"],
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
                bas de ta page.
              </p>
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
            <AccordionContent className="space-y-2 pt-1">
              <Input
                value={page.offer}
                maxLength={100}
                placeholder="Ex : -20% pour toute première visite en janvier"
                onChange={(e) => patch({ offer: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                S&apos;affiche en bandeau tout en haut de ta page. Facultatif.
              </p>
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
            <VitrineView page={page} families={previewFamilies} />
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
