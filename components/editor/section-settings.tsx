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
import { useI18n } from "@/components/i18n-provider";

type Props = {
  section: BlockSection;
  userId: string;
  pageAddress: string;
  onChange: (section: BlockSection) => void;
};

// Mini-formulaire de réglages d'un bloc de contenu. Chaque modification
// remonte la section complète (autosavée via patch({ sections })).
export function SectionSettings({ section, userId, pageAddress, onChange }: Props) {
  const { editor, dictionary } = useI18n();
  const t = editor.sectionSettings;
  const set = (settings: BlockSection["settings"]) =>
    onChange({ ...section, settings } as BlockSection);

  switch (section.type) {
    case "texte":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>{t.texte.title}</Label>
            <Input
              value={section.settings.title}
              maxLength={SECTION_LIMITS.maxTitleLength}
              onChange={(e) => set({ ...section.settings, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t.texte.body}</Label>
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
            <Label>{t.imageTexte.image}</Label>
            <div className="flex items-center gap-3">
              <PhotoUpload
                userId={userId}
                label={section.settings.imageUrl ? t.imageTexte.changeImage : t.imageTexte.chooseImage}
                messages={dictionary.photoUpload}
                onUploaded={(url) => set({ ...section.settings, imageUrl: url })}
              />
              {section.settings.imageUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => set({ ...section.settings, imageUrl: null })}
                >
                  {t.remove}
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t.imageTexte.imageSide}</Label>
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
                <SelectItem value="left">{t.imageTexte.left}</SelectItem>
                <SelectItem value="right">{t.imageTexte.right}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t.imageTexte.title}</Label>
            <Input
              value={section.settings.title}
              maxLength={SECTION_LIMITS.maxTitleLength}
              onChange={(e) => set({ ...section.settings, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t.imageTexte.body}</Label>
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
            <Label>{t.faq.titleOptional}</Label>
            <Input
              value={section.settings.title ?? ""}
              maxLength={SECTION_LIMITS.maxTitleLength}
              placeholder={t.faq.titlePlaceholder}
              onChange={(e) => set({ ...section.settings, title: e.target.value })}
            />
          </div>
          {section.settings.items.map((item, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2">
              <Input
                value={item.question}
                maxLength={160}
                placeholder={t.faq.questionPlaceholder}
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
                placeholder={t.faq.answerPlaceholder}
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
                {t.remove}
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
              {t.faq.addQuestion}
            </Button>
          )}
        </div>
      );

    case "a_propos":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>{t.aPropos.photo}</Label>
            <div className="flex items-center gap-3">
              <PhotoUpload
                userId={userId}
                label={section.settings.photoUrl ? t.aPropos.changePhoto : t.aPropos.choosePhoto}
                messages={dictionary.photoUpload}
                onUploaded={(url) => set({ ...section.settings, photoUrl: url })}
              />
              {section.settings.photoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => set({ ...section.settings, photoUrl: null })}
                >
                  {t.remove}
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t.aPropos.title}</Label>
            <Input
              value={section.settings.title}
              maxLength={SECTION_LIMITS.maxTitleLength}
              placeholder={t.aPropos.titlePlaceholder}
              onChange={(e) => set({ ...section.settings, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t.aPropos.story}</Label>
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
              ["beforeUrl", t.avantApres.before],
              ["afterUrl", t.avantApres.after],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <div className="flex items-center gap-3">
                <PhotoUpload
                  userId={userId}
                  label={section.settings[key] ? t.avantApres.change : t.avantApres.choose}
                  messages={dictionary.photoUpload}
                  onUploaded={(url) => set({ ...section.settings, [key]: url })}
                />
                {section.settings[key] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => set({ ...section.settings, [key]: null })}
                  >
                    {t.remove}
                  </Button>
                )}
              </div>
            </div>
          ))}
          <div className="space-y-2">
            <Label>{t.avantApres.captionOptional}</Label>
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
        <div className="space-y-2 rounded-lg border border-border p-3">
          <Label>{t.carte.label}</Label>
          <p className="text-sm font-medium">
            {pageAddress.trim() || t.carte.noAddress}
          </p>
          <p className="text-xs text-muted-foreground">
            {pageAddress.trim() ? t.carte.linked : t.carte.needsAddress}
          </p>
        </div>
      );

    case "google_business":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>{t.googleBusiness.linkLabel}</Label>
            <Input
              type="url"
              value={section.settings.url}
              maxLength={500}
              placeholder={t.googleBusiness.linkPlaceholder}
              onChange={(e) => set({ ...section.settings, url: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">{t.googleBusiness.linkHint}</p>
          </div>
          <div className="space-y-2">
            <Label>{t.googleBusiness.titleOptional}</Label>
            <Input
              value={section.settings.title ?? ""}
              maxLength={SECTION_LIMITS.maxTitleLength}
              placeholder={t.googleBusiness.titlePlaceholder}
              onChange={(e) => set({ ...section.settings, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t.googleBusiness.messageOptional}</Label>
            <Textarea
              value={section.settings.description ?? ""}
              rows={3}
              maxLength={300}
              placeholder={t.googleBusiness.messagePlaceholder}
              onChange={(e) => set({ ...section.settings, description: e.target.value })}
            />
          </div>
        </div>
      );

    case "newsletter":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>{t.newsletter.titleOptional}</Label>
            <Input
              value={section.settings.title ?? ""}
              maxLength={SECTION_LIMITS.maxTitleLength}
              placeholder={t.newsletter.titlePlaceholder}
              onChange={(e) => set({ ...section.settings, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t.newsletter.textOptional}</Label>
            <Input
              value={section.settings.description ?? ""}
              maxLength={200}
              placeholder={t.newsletter.textPlaceholder}
              onChange={(e) =>
                set({ ...section.settings, description: e.target.value })
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">{t.newsletter.hint}</p>
        </div>
      );

    case "video":
      return (
        <div className="space-y-2">
          <Label>{t.video.linkLabel}</Label>
          <Input
            value={section.settings.url}
            maxLength={300}
            placeholder={t.video.linkPlaceholder}
            onChange={(e) => set({ url: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">{t.video.hint}</p>
        </div>
      );
  }
}
