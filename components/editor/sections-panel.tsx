"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ADDABLE_SECTION_TYPES,
  NATIVE_SECTION_TYPES,
  SECTION_LIMITS,
  SECTION_META,
  createBlockSection,
  isNativeSection,
  type BlockSectionType,
  type NativeSectionType,
  type PageSection,
  type SectionType,
} from "@/lib/sections";
import { SectionSettings } from "./section-settings";
import { SectionStyleSettings } from "./section-style-settings";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Copy,
  GripVertical,
  Paintbrush,
  Settings2,
  Trash2,
} from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import type { EditorDict } from "@/lib/i18n/get-dictionary";

type Props = {
  sections: PageSection[]; // liste résolue (jamais null)
  userId: string;
  pageAddress: string;
  onChange: (sections: PageSection[]) => void;
  // Sous-page : les sections natives y sont facultatives — supprimables et
  // ré-ajoutables (sur la home elles sont fixes, seulement masquables).
  subpage?: boolean;
};

function sectionLabel(section: PageSection): string {
  const meta = SECTION_META[section.type];
  if (isNativeSection(section)) return meta.label;
  const settings = section.settings as { title?: string };
  return settings.title?.trim() ? `${meta.label} — ${settings.title}` : meta.label;
}

function newSectionId(type: string): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${type}-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

// Panneau « Sections de ma page » : réordonner par glisser-déposer (poignée,
// clavier supporté via @dnd-kit), activer/désactiver, régler l'apparence et le
// contenu, dupliquer et supprimer les blocs, en ajouter de nouveaux. Chaque
// mutation écrit la liste complète dans le brouillon via onChange.
export function SectionsPanel({ sections, userId, pageAddress, onChange, subpage = false }: Props) {
  const { editor } = useI18n();
  const t = editor.sectionsPanel;
  const [openSettings, setOpenSettings] = useState<string | null>(null);
  const [openStyle, setOpenStyle] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Types proposés à l'ajout : les blocs de contenu, plus (en sous-page) les
  // sections natives absentes de la liste.
  const presentTypes = new Set(sections.map((s) => s.type));
  const addableTypes: SectionType[] = [
    ...ADDABLE_SECTION_TYPES,
    ...(subpage
      ? NATIVE_SECTION_TYPES.filter((t) => !presentTypes.has(t))
      : []),
  ];

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = sections.findIndex((s) => s.id === active.id);
    const to = sections.findIndex((s) => s.id === over.id);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(sections, from, to));
  };

  const update = (id: string, section: PageSection) => {
    onChange(sections.map((s) => (s.id === id ? section : s)));
  };

  const remove = (id: string) => {
    onChange(sections.filter((s) => s.id !== id));
    if (openSettings === id) setOpenSettings(null);
    if (openStyle === id) setOpenStyle(null);
  };

  const duplicate = (id: string) => {
    if (sections.length >= SECTION_LIMITS.maxSections) return;
    const index = sections.findIndex((s) => s.id === id);
    const original = sections[index];
    if (!original || isNativeSection(original)) return;
    const clone = structuredClone(original);
    clone.id = newSectionId(clone.type);
    const next = [...sections];
    next.splice(index + 1, 0, clone);
    onChange(next);
    setOpenSettings(clone.id);
    setOpenStyle(null);
  };

  const add = (type: SectionType) => {
    if ((NATIVE_SECTION_TYPES as string[]).includes(type)) {
      const native: PageSection = {
        id: type,
        type: type as NativeSectionType,
        enabled: true,
      };
      onChange([...sections, native]);
      setAdding(false);
      return;
    }
    const block = createBlockSection(type as BlockSectionType);
    onChange([...sections, block]);
    setAdding(false);
    setOpenSettings(block.id);
  };

  const atLimit = sections.length >= SECTION_LIMITS.maxSections;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t.hint}</p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {sections.map((section) => (
              <SortableSectionRow
                key={section.id}
                section={section}
                subpage={subpage}
                atLimit={atLimit}
                settingsOpen={openSettings === section.id}
                styleOpen={openStyle === section.id}
                onToggleSettings={() => {
                  setOpenSettings(
                    openSettings === section.id ? null : section.id
                  );
                  setOpenStyle(null);
                }}
                onToggleStyle={() => {
                  setOpenStyle(openStyle === section.id ? null : section.id);
                  setOpenSettings(null);
                }}
                onUpdate={(next) => update(section.id, next)}
                onDuplicate={() => duplicate(section.id)}
                onRemove={() => remove(section.id)}
                userId={userId}
                pageAddress={pageAddress}
                t={t}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {adding ? (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="text-sm font-medium">{t.addPrompt}</p>
          <div className="grid grid-cols-2 gap-2">
            {addableTypes.map((type) => (
              <button
                key={type}
                type="button"
                className="rounded-lg border border-border p-2 text-left hover:border-foreground/40 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={type === "carte" && !pageAddress.trim()}
                onClick={() => add(type)}
              >
                <p className="text-sm font-medium">{SECTION_META[type].label}</p>
                <p className="text-xs text-muted-foreground">
                  {type === "carte" && !pageAddress.trim()
                    ? t.mapNeedsAddress
                    : SECTION_META[type].description}
                </p>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
            {t.cancel}
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          disabled={atLimit}
          onClick={() => setAdding(true)}
        >
          {t.addBlock}
        </Button>
      )}
    </div>
  );
}

function SortableSectionRow({
  section,
  subpage,
  atLimit,
  settingsOpen,
  styleOpen,
  onToggleSettings,
  onToggleStyle,
  onUpdate,
  onDuplicate,
  onRemove,
  userId,
  pageAddress,
  t,
}: {
  section: PageSection;
  subpage: boolean;
  atLimit: boolean;
  settingsOpen: boolean;
  styleOpen: boolean;
  onToggleSettings: () => void;
  onToggleStyle: () => void;
  onUpdate: (section: PageSection) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  userId: string;
  pageAddress: string;
  t: EditorDict["sectionsPanel"];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });
  const native = isNativeSection(section);

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`rounded-lg border border-border bg-background ${
        isDragging ? "z-10 opacity-80 shadow-lg" : ""
      }`}
    >
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          aria-label={t.move.replace("{label}", sectionLabel(section))}
          className="cursor-grab touch-none p-1 text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{sectionLabel(section)}</p>
          <p className="truncate text-xs text-muted-foreground">
            {SECTION_META[section.type].description}
          </p>
        </div>
        {!native && (
          <>
            <button
              type="button"
              aria-label={t.settings}
              className={`p-1 ${settingsOpen ? "text-foreground" : "text-muted-foreground"}`}
              onClick={onToggleSettings}
            >
              <Settings2 className="size-4" />
            </button>
            <button
              type="button"
              aria-label={t.duplicate}
              className="p-1 text-muted-foreground disabled:opacity-30"
              disabled={atLimit}
              onClick={onDuplicate}
            >
              <Copy className="size-4" />
            </button>
          </>
        )}
        <button
          type="button"
          aria-label={t.appearance}
          className={`p-1 ${styleOpen || section.style ? "text-foreground" : "text-muted-foreground"}`}
          onClick={onToggleStyle}
        >
          <Paintbrush className="size-4" />
        </button>
        {(!native || subpage) && (
          <button
            type="button"
            aria-label={t.delete}
            className="p-1 text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </button>
        )}
        <Switch
          checked={section.enabled}
          aria-label={t.show.replace("{label}", sectionLabel(section))}
          onCheckedChange={(enabled) =>
            onUpdate({ ...section, enabled } as PageSection)
          }
        />
      </div>
      {!native && settingsOpen && (
        <div className="border-t border-border p-3">
          <SectionSettings
            section={section}
            userId={userId}
            pageAddress={pageAddress}
            onChange={onUpdate}
          />
        </div>
      )}
      {styleOpen && (
        <div className="border-t border-border p-3">
          <SectionStyleSettings
            style={section.style}
            userId={userId}
            onChange={(style) => onUpdate({ ...section, style } as PageSection)}
          />
        </div>
      )}
    </li>
  );
}
