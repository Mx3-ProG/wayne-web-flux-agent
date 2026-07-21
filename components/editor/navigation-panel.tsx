"use client";

// Panneau « Menu de navigation » de l'éditeur : active le header configurable,
// gère la liste ordonnée des liens (page interne / ancre de section / URL
// externe), les options sticky / transparent / logo et le bouton scroll-top.

import type { Page, NavItem, PageNavigation, SitePage } from "@/lib/types";
import { resolveSections, SECTION_META } from "@/lib/sections";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

const MAX_ITEMS = 8;

type Props = {
  page: Page;
  sitePages: SitePage[];
  patch: (fields: Partial<Page>) => void;
};

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `nav-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

export function NavigationPanel({ page, sitePages, patch }: Props) {
  const { editor } = useI18n();
  const t = editor.navigationPanel;
  const nav = page.navigation;

  // Cibles proposées : pages du projet + ancres des sections activées.
  const pageTargets = [
    { value: "", label: t.home },
    ...sitePages
      .filter((sp) => sp.draft_status !== "deleted")
      .map((sp) => {
        const merged = { ...sp, ...(sp.draft ?? {}) };
        return { value: merged.path, label: merged.title || merged.path };
      }),
  ];
  const anchorTargets = resolveSections(page)
    .filter((s) => s.enabled)
    .map((s) => {
      const settings = s.settings as { title?: string } | undefined;
      const label = settings?.title?.trim() || SECTION_META[s.type].label;
      // Les natives pleine largeur gardent leurs ancres historiques.
      const anchor =
        s.type === "offres"
          ? "#offres"
          : s.type === "boutique"
            ? "#boutique"
            : s.type === "prestations"
              ? "#prestations"
              : `#s-${s.id}`;
      return { value: anchor, label };
    })
    .filter((t, i, arr) => arr.findIndex((o) => o.value === t.value) === i);

  const setNav = (fields: Partial<PageNavigation>) => {
    patch({ navigation: { items: [], ...nav, ...fields } });
  };

  const setItem = (id: string, fields: Partial<NavItem>) => {
    if (!nav) return;
    setNav({
      items: nav.items.map((item) =>
        item.id === id ? { ...item, ...fields } : item
      ),
    });
  };

  const move = (index: number, delta: number) => {
    if (!nav) return;
    const to = index + delta;
    if (to < 0 || to >= nav.items.length) return;
    const items = [...nav.items];
    const [item] = items.splice(index, 1);
    items.splice(to, 0, item);
    setNav({ items });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>{t.title}</Label>
          <p className="text-xs text-muted-foreground">{t.description}</p>
        </div>
        <Switch
          checked={Boolean(nav)}
          onCheckedChange={(on) =>
            patch({
              navigation: on
                ? {
                    items: [
                      { id: newId(), label: t.home, kind: "page", target: "" },
                      ...sitePages
                        .filter((sp) => sp.draft_status !== "deleted")
                        .slice(0, 4)
                        .map((sp): NavItem => {
                          const merged = { ...sp, ...(sp.draft ?? {}) };
                          return {
                            id: newId(),
                            label: merged.title || merged.path,
                            kind: "page",
                            target: merged.path,
                          };
                        }),
                    ],
                    sticky: false,
                    transparent: false,
                    showLogo: true,
                  }
                : null,
            })
          }
        />
      </div>

      {nav && (
        <>
          <ul className="space-y-2">
            {nav.items.map((item, i) => (
              <li key={item.id} className="rounded-lg border border-border p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      aria-label={t.moveUp}
                      disabled={i === 0}
                      className="text-muted-foreground disabled:opacity-30"
                      onClick={() => move(i, -1)}
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t.moveDown}
                      disabled={i === nav.items.length - 1}
                      className="text-muted-foreground disabled:opacity-30"
                      onClick={() => move(i, 1)}
                    >
                      <ChevronDown className="size-4" />
                    </button>
                  </div>
                  <Input
                    value={item.label}
                    maxLength={40}
                    placeholder={t.linkPlaceholder}
                    onChange={(e) => setItem(item.id, { label: e.target.value })}
                  />
                  <button
                    type="button"
                    aria-label={t.deleteLink}
                    className="p-1 text-destructive"
                    onClick={() =>
                      setNav({ items: nav.items.filter((x) => x.id !== item.id) })
                    }
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={item.kind}
                    onValueChange={(kind) =>
                      setItem(item.id, {
                        kind: kind as NavItem["kind"],
                        target:
                          kind === "page"
                            ? ""
                            : kind === "anchor"
                              ? (anchorTargets[0]?.value ?? "#offres")
                              : "",
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="page">{t.kindPage}</SelectItem>
                      <SelectItem value="anchor">{t.kindAnchor}</SelectItem>
                      <SelectItem value="external">{t.kindExternal}</SelectItem>
                    </SelectContent>
                  </Select>
                  {item.kind === "external" ? (
                    <Input
                      value={item.target}
                      maxLength={300}
                      placeholder={t.externalPlaceholder}
                      onChange={(e) => setItem(item.id, { target: e.target.value })}
                    />
                  ) : (
                    <Select
                      value={item.target}
                      onValueChange={(target) => setItem(item.id, { target })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t.choose} />
                      </SelectTrigger>
                      <SelectContent>
                        {(item.kind === "page" ? pageTargets : anchorTargets).map(
                          (t) => (
                            <SelectItem key={t.value || "home"} value={t.value}>
                              {t.label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Button
            variant="secondary"
            size="sm"
            disabled={nav.items.length >= MAX_ITEMS}
            onClick={() =>
              setNav({
                items: [
                  ...nav.items,
                  { id: newId(), label: t.newLink, kind: "page", target: "" },
                ],
              })
            }
          >
            {t.addLink}
          </Button>

          <div className="space-y-3 rounded-lg border border-border p-3">
            {(
              [
                ["sticky", t.stickyLabel, t.stickyHint],
                ["transparent", t.transparentLabel, t.transparentHint],
                ["showLogo", t.showLogoLabel, t.showLogoHint],
              ] as const
            ).map(([key, label, hint]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <div>
                  <Label>{label}</Label>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
                <Switch
                  checked={
                    key === "showLogo" ? nav.showLogo !== false : Boolean(nav[key])
                  }
                  onCheckedChange={(value) => setNav({ [key]: value })}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div>
          <Label>{t.scrollTopLabel}</Label>
          <p className="text-xs text-muted-foreground">{t.scrollTopHint}</p>
        </div>
        <Switch
          checked={page.scroll_top ?? false}
          onCheckedChange={(scroll_top) => patch({ scroll_top })}
        />
      </div>
    </div>
  );
}
