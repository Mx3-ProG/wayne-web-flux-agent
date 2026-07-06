"use client";

import type { BlockSection } from "@/lib/sections";
import { SECTION_LIMITS } from "@/lib/sections";
import { PhotoUpload } from "./photo-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  section: BlockSection;
  userId: string;
  onChange: (section: BlockSection) => void;
};

// Mini-formulaire de réglages d'un bloc de contenu. Chaque modification
// remonte la section complète (autosavée via patch({ sections })).
export function SectionSettings({ section, userId, onChange }: Props) {
  const set = (settings: BlockSection["settings"]) =>
    onChange({ ...section, settings } as BlockSection);

  switch (section.type) {
    case "texte":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input
              value={section.settings.title}
              maxLength={SECTION_LIMITS.maxTitleLength}
              onChange={(e) => set({ ...section.settings, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Texte (saute une ligne pour un nouveau paragraphe)</Label>
            <Textarea
              value={section.settings.body}
              rows={5}
              maxLength={SECTION_LIMITS.maxBodyLength}
              onChange={(e) => set({ ...section.settings, body: e.target.value })}
            />
          </div>
        </div>
      );

    case "image_texte":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Image</Label>
            <div className="flex items-center gap-3">
              <PhotoUpload
                userId={userId}
                label={section.settings.imageUrl ? "Changer l'image" : "Choisir une image"}
                onUploaded={(url) => set({ ...section.settings, imageUrl: url })}
              />
              {section.settings.imageUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => set({ ...section.settings, imageUrl: null })}
                >
                  Retirer
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Côté de l&apos;image</Label>
            <Select
              value={section.settings.imageSide}
              onValueChange={(imageSide) =>
                set({ ...section.settings, imageSide: imageSide as "left" | "right" })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">À gauche</SelectItem>
                <SelectItem value="right">À droite</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input
              value={section.settings.title}
              maxLength={SECTION_LIMITS.maxTitleLength}
              onChange={(e) => set({ ...section.settings, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Texte</Label>
            <Textarea
              value={section.settings.body}
              rows={4}
              maxLength={SECTION_LIMITS.maxBodyLength}
              onChange={(e) => set({ ...section.settings, body: e.target.value })}
            />
          </div>
        </div>
      );

    case "faq":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Titre (facultatif)</Label>
            <Input
              value={section.settings.title ?? ""}
              maxLength={SECTION_LIMITS.maxTitleLength}
              placeholder="FAQ"
              onChange={(e) => set({ ...section.settings, title: e.target.value })}
            />
          </div>
          {section.settings.items.map((item, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2">
              <Input
                value={item.question}
                maxLength={160}
                placeholder="La question"
                onChange={(e) => {
                  const items = [...section.settings.items];
                  items[i] = { ...items[i], question: e.target.value };
                  set({ ...section.settings, items });
                }}
              />
              <Textarea
                value={item.answer}
                rows={3}
                maxLength={SECTION_LIMITS.maxBodyLength}
                placeholder="Ta réponse"
                onChange={(e) => {
                  const items = [...section.settings.items];
                  items[i] = { ...items[i], answer: e.target.value };
                  set({ ...section.settings, items });
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  set({
                    ...section.settings,
                    items: section.settings.items.filter((_, j) => j !== i),
                  })
                }
              >
                Retirer
              </Button>
            </div>
          ))}
          {section.settings.items.length < SECTION_LIMITS.maxFaqItems && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                set({
                  ...section.settings,
                  items: [...section.settings.items, { question: "", answer: "" }],
                })
              }
            >
              + Ajouter une question
            </Button>
          )}
        </div>
      );

    case "a_propos":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Ta photo</Label>
            <div className="flex items-center gap-3">
              <PhotoUpload
                userId={userId}
                label={section.settings.photoUrl ? "Changer la photo" : "Choisir une photo"}
                onUploaded={(url) => set({ ...section.settings, photoUrl: url })}
              />
              {section.settings.photoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => set({ ...section.settings, photoUrl: null })}
                >
                  Retirer
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input
              value={section.settings.title}
              maxLength={SECTION_LIMITS.maxTitleLength}
              placeholder="Ex : Derrière les ciseaux, moi"
              onChange={(e) => set({ ...section.settings, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Ton histoire</Label>
            <Textarea
              value={section.settings.body}
              rows={5}
              maxLength={SECTION_LIMITS.maxBodyLength}
              onChange={(e) => set({ ...section.settings, body: e.target.value })}
            />
          </div>
        </div>
      );

    case "avant_apres":
      return (
        <div className="space-y-3">
          {(
            [
              ["beforeUrl", "Photo « avant »"],
              ["afterUrl", "Photo « après »"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <div className="flex items-center gap-3">
                <PhotoUpload
                  userId={userId}
                  label={section.settings[key] ? "Changer" : "Choisir"}
                  onUploaded={(url) => set({ ...section.settings, [key]: url })}
                />
                {section.settings[key] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => set({ ...section.settings, [key]: null })}
                  >
                    Retirer
                  </Button>
                )}
              </div>
            </div>
          ))}
          <div className="space-y-2">
            <Label>Légende (facultatif)</Label>
            <Input
              value={section.settings.caption ?? ""}
              maxLength={SECTION_LIMITS.maxTitleLength}
              onChange={(e) => set({ ...section.settings, caption: e.target.value })}
            />
          </div>
        </div>
      );

    case "carte":
      return (
        <div className="space-y-2">
          <Label>Lieu affiché sur la carte</Label>
          <Input
            value={section.settings.query ?? ""}
            maxLength={160}
            placeholder="Par défaut : ton adresse et ta ville"
            onChange={(e) => set({ query: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Laisse vide pour utiliser l&apos;adresse renseignée dans « Identité ».
          </p>
        </div>
      );

    case "newsletter":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Titre (facultatif)</Label>
            <Input
              value={section.settings.title ?? ""}
              maxLength={SECTION_LIMITS.maxTitleLength}
              placeholder="Reste informé"
              onChange={(e) => set({ ...section.settings, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Petit texte (facultatif)</Label>
            <Input
              value={section.settings.description ?? ""}
              maxLength={200}
              placeholder="Reçois mes offres et mes nouveautés, sans spam."
              onChange={(e) =>
                set({ ...section.settings, description: e.target.value })
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Les emails récoltés se retrouvent dans « Statistiques ».
          </p>
        </div>
      );

    case "video":
      return (
        <div className="space-y-2">
          <Label>Lien de la vidéo</Label>
          <Input
            value={section.settings.url}
            maxLength={300}
            placeholder="https://www.youtube.com/watch?v=…"
            onChange={(e) => set({ url: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            YouTube, Vimeo ou un lien direct vers un fichier vidéo.
          </p>
        </div>
      );
  }
}
