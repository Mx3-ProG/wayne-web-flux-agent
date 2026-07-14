"use client";

// Réglages d'apparence d'une section (section.style) : fond (couleur,
// dégradé, image ou vidéo + voile), espacement vertical, largeur du contenu
// et alignement. Ouvert depuis le panneau Sections, natives comprises.

import type { SectionBackground, SectionStyle } from "@/lib/sections";
import { PhotoUpload } from "./photo-upload";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  style: SectionStyle | undefined;
  userId: string;
  onChange: (style: SectionStyle | undefined) => void;
};

type BackgroundKind = "none" | SectionBackground["kind"];

export function SectionStyleSettings({ style, userId, onChange }: Props) {
  const bg = style?.background;

  const set = (fields: Partial<SectionStyle>) => {
    const next: SectionStyle = { ...style, ...fields };
    if (!next.background) delete next.background;
    if (!next.spacing || next.spacing === "normal") delete next.spacing;
    if (!next.width || next.width === "normal") delete next.width;
    if (!next.align || next.align === "left") delete next.align;
    onChange(Object.keys(next).length > 0 ? next : undefined);
  };

  const setBackgroundKind = (kind: BackgroundKind) => {
    switch (kind) {
      case "none":
        set({ background: undefined });
        break;
      case "color":
        set({ background: { kind: "color", color: "#101014" } });
        break;
      case "gradient":
        set({
          background: { kind: "gradient", from: "#101014", to: "#3d0d0d" },
        });
        break;
      case "image":
        set({ background: { kind: "image", url: "", overlay: 0.35 } });
        break;
      case "video":
        set({ background: { kind: "video", url: "", overlay: 0.35 } });
        break;
    }
  };

  const overlay =
    bg && (bg.kind === "image" || bg.kind === "video") ? (bg.overlay ?? 0.35) : null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Fond de la section</Label>
        <Select
          value={(bg?.kind ?? "none") as string}
          onValueChange={(kind) => setBackgroundKind(kind as BackgroundKind)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun (fond de la page)</SelectItem>
            <SelectItem value="color">Une couleur</SelectItem>
            <SelectItem value="gradient">Un dégradé</SelectItem>
            <SelectItem value="image">Une photo</SelectItem>
            <SelectItem value="video">Une vidéo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {bg?.kind === "color" && (
        <input
          type="color"
          value={bg.color}
          className="h-10 w-full cursor-pointer rounded-lg border border-border bg-transparent"
          onChange={(e) =>
            set({ background: { kind: "color", color: e.target.value } })
          }
        />
      )}

      {bg?.kind === "gradient" && (
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["from", "Départ"],
              ["to", "Arrivée"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <input
                type="color"
                value={bg[key]}
                className="h-10 w-full cursor-pointer rounded-lg border border-border bg-transparent"
                onChange={(e) =>
                  set({ background: { ...bg, [key]: e.target.value } })
                }
              />
            </div>
          ))}
        </div>
      )}

      {bg?.kind === "image" && (
        <div className="flex items-center gap-3">
          <PhotoUpload
            userId={userId}
            label={bg.url ? "Changer la photo" : "Choisir la photo"}
            onUploaded={(url) => set({ background: { ...bg, url } })}
          />
          {bg.url && (
            <span className="text-xs text-muted-foreground">Photo choisie ✓</span>
          )}
        </div>
      )}

      {bg?.kind === "video" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <PhotoUpload
              userId={userId}
              label={bg.url ? "Changer la vidéo" : "Choisir la vidéo"}
              accept="video/mp4,video/webm"
              maxMb={50}
              onUploaded={(url) => set({ background: { ...bg, url } })}
            />
            {bg.url && (
              <span className="text-xs text-muted-foreground">Vidéo choisie ✓</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <PhotoUpload
              userId={userId}
              label={bg.posterUrl ? "Changer l'image d'attente" : "Image d'attente"}
              onUploaded={(posterUrl) => set({ background: { ...bg, posterUrl } })}
            />
            {bg.posterUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => set({ background: { ...bg, posterUrl: undefined } })}
              >
                Retirer
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Une seule vidéo de fond par page, courte et sans son — préfère une
            photo pour garder ta page rapide.
          </p>
        </div>
      )}

      {overlay !== null && bg && (
        <div className="space-y-2">
          <Label>Voile sombre ({Math.round(overlay * 100)} %)</Label>
          <input
            type="range"
            min={0}
            max={0.8}
            step={0.05}
            value={overlay}
            className="w-full"
            onChange={(e) =>
              set({
                background: { ...bg, overlay: Number(e.target.value) } as SectionBackground,
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            Assombrit la photo ou la vidéo pour garder le texte lisible.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Espacement</Label>
          <Select
            value={style?.spacing ?? "normal"}
            onValueChange={(spacing) =>
              set({ spacing: spacing as SectionStyle["spacing"] })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="large">Aéré</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Largeur</Label>
          <Select
            value={style?.width ?? "normal"}
            onValueChange={(width) => set({ width: width as SectionStyle["width"] })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="narrow">Étroit</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="full">Pleine largeur</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Alignement</Label>
          <Select
            value={style?.align ?? "left"}
            onValueChange={(align) => set({ align: align as SectionStyle["align"] })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">À gauche</SelectItem>
              <SelectItem value="center">Centré</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {style && (
        <Button variant="ghost" size="sm" onClick={() => onChange(undefined)}>
          Réinitialiser l&apos;apparence
        </Button>
      )}
    </div>
  );
}
