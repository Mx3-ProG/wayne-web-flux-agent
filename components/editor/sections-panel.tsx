"use client";

import { useState } from "react";
import {
  ADDABLE_SECTION_TYPES,
  SECTION_LIMITS,
  SECTION_META,
  createBlockSection,
  isNativeSection,
  type BlockSectionType,
  type PageSection,
} from "@/lib/sections";
import { SectionSettings } from "./section-settings";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronUp, Settings2, Trash2 } from "lucide-react";

type Props = {
  sections: PageSection[]; // liste résolue (jamais null)
  userId: string;
  onChange: (sections: PageSection[]) => void;
};

function sectionLabel(section: PageSection): string {
  const meta = SECTION_META[section.type];
  if (isNativeSection(section)) return meta.label;
  const settings = section.settings as { title?: string };
  return settings.title?.trim() ? `${meta.label} — ${settings.title}` : meta.label;
}

// Panneau « Sections de ma page » : réordonner (▲/▼), activer/désactiver,
// régler et supprimer les blocs, en ajouter de nouveaux. Chaque mutation
// écrit la liste complète dans le brouillon via onChange.
// L'API (onChange sur liste complète + move(from,to)) est prête pour brancher
// un drag & drop (@dnd-kit) plus tard sans refonte.
export function SectionsPanel({ sections, userId, onChange }: Props) {
  const [openSettings, setOpenSettings] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= sections.length) return;
    const next = [...sections];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const update = (id: string, section: PageSection) => {
    onChange(sections.map((s) => (s.id === id ? section : s)));
  };

  const remove = (id: string) => {
    onChange(sections.filter((s) => s.id !== id));
    if (openSettings === id) setOpenSettings(null);
  };

  const add = (type: BlockSectionType) => {
    const block = createBlockSection(type);
    onChange([...sections, block]);
    setAdding(false);
    setOpenSettings(block.id);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Choisis l&apos;ordre des sections de ta page, masque celles que tu ne veux
        pas, et ajoute tes propres blocs.
      </p>
      <ul className="space-y-2">
        {sections.map((section, i) => {
          const native = isNativeSection(section);
          const settingsOpen = openSettings === section.id;
          return (
            <li key={section.id} className="rounded-lg border border-border">
              <div className="flex items-center gap-2 p-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label="Monter la section"
                    disabled={i === 0}
                    className="text-muted-foreground disabled:opacity-30"
                    onClick={() => move(i, i - 1)}
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Descendre la section"
                    disabled={i === sections.length - 1}
                    className="text-muted-foreground disabled:opacity-30"
                    onClick={() => move(i, i + 1)}
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {sectionLabel(section)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {SECTION_META[section.type].description}
                  </p>
                </div>
                {!native && (
                  <>
                    <button
                      type="button"
                      aria-label="Réglages du bloc"
                      className={`p-1 ${settingsOpen ? "text-foreground" : "text-muted-foreground"}`}
                      onClick={() =>
                        setOpenSettings(settingsOpen ? null : section.id)
                      }
                    >
                      <Settings2 className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Supprimer le bloc"
                      className="p-1 text-destructive"
                      onClick={() => remove(section.id)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
                <Switch
                  checked={section.enabled}
                  aria-label={`Afficher « ${sectionLabel(section)} »`}
                  onCheckedChange={(enabled) =>
                    update(section.id, { ...section, enabled } as PageSection)
                  }
                />
              </div>
              {!native && settingsOpen && (
                <div className="border-t border-border p-3">
                  <SectionSettings
                    section={section}
                    userId={userId}
                    onChange={(next) => update(section.id, next)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {adding ? (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="text-sm font-medium">Quel bloc veux-tu ajouter ?</p>
          <div className="grid grid-cols-2 gap-2">
            {ADDABLE_SECTION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className="rounded-lg border border-border p-2 text-left hover:border-foreground/40"
                onClick={() => add(type)}
              >
                <p className="text-sm font-medium">{SECTION_META[type].label}</p>
                <p className="text-xs text-muted-foreground">
                  {SECTION_META[type].description}
                </p>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
            Annuler
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          disabled={sections.length >= SECTION_LIMITS.maxSections}
          onClick={() => setAdding(true)}
        >
          + Ajouter un bloc
        </Button>
      )}
    </div>
  );
}
