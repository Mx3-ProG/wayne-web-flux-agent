"use client";

// Gestion des langues de la boutique (Lot 7) : statut par langue activée
// (à jour / en cours / partielle / erreur avec retry), activation d'une
// nouvelle langue avec coût affiché avant confirmation, désactivation
// indépendante. Jamais de correction manuelle écrasée silencieusement : ce
// panneau ne touche jamais au contenu traduit lui-même, seulement à
// l'activation/désactivation de la langue.

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import type { Page } from "@/lib/types";
import { LOCALE_LABELS, locales, type Locale } from "@/lib/i18n/config";
import { STOREFRONT_LANGUAGE_COST } from "@/lib/plans";
import {
  activatePageLocale,
  deactivatePageLocale,
  getPageLocaleStatuses,
  retryLocaleTranslation,
  type LocaleStatusRow,
} from "@/app/(app)/ma-page/translation-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import type { EditorDict } from "@/lib/i18n/get-dictionary";

type Props = {
  page: Page;
  balance: number;
  t: EditorDict["pageEditor"]["languages"];
  onLocalesChange: (enabledLocales: Locale[]) => void;
};

const STATUS_ICON: Record<LocaleStatusRow["status"], React.ReactNode> = {
  up_to_date: <CheckCircle2 aria-hidden="true" className="text-emerald-600" size={16} />,
  in_progress: <Loader2 aria-hidden="true" className="animate-spin text-amber-600" size={16} />,
  stale: <AlertTriangle aria-hidden="true" className="text-amber-600" size={16} />,
  error: <AlertTriangle aria-hidden="true" className="text-destructive" size={16} />,
};

export function LanguageManager({ page, balance, t, onLocalesChange }: Props) {
  const [statuses, setStatuses] = useState<LocaleStatusRow[]>([]);
  const [activateTarget, setActivateTarget] = useState<Locale | null>(null);
  const [insufficientCredits, setInsufficientCredits] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getPageLocaleStatuses(page.id).then((rows) => {
      if (!cancelled) setStatuses(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [page.id]);

  function statusLabel(status: LocaleStatusRow["status"]): string {
    return {
      up_to_date: t.statusUpToDate,
      in_progress: t.statusInProgress,
      stale: t.statusStale,
      error: t.statusError,
    }[status];
  }

  function retry(locale: Locale) {
    startTransition(async () => {
      const result = await retryLocaleTranslation(page.id, locale);
      if (result.error) {
        toast.error(t.genericError);
        return;
      }
      setStatuses((prev) =>
        prev.map((s) => (s.locale === locale ? { ...s, status: "in_progress", lastError: null } : s))
      );
    });
  }

  function deactivate(locale: Locale) {
    if (!window.confirm(t.deactivateConfirm)) return;
    startTransition(async () => {
      const result = await deactivatePageLocale(page.id, locale);
      if (result.error) {
        toast.error(t.genericError);
        return;
      }
      if (result.enabledLocales) onLocalesChange(result.enabledLocales);
      setStatuses((prev) => prev.filter((s) => s.locale !== locale));
    });
  }

  function confirmActivate() {
    if (!activateTarget) return;
    const locale = activateTarget;
    startTransition(async () => {
      const result = await activatePageLocale(page.id, locale);
      if (result.error === "insufficient_credits") {
        setInsufficientCredits(true);
        return;
      }
      if (result.error) {
        toast.error(t.genericError);
        setActivateTarget(null);
        return;
      }
      if (result.enabledLocales) onLocalesChange(result.enabledLocales);
      setActivateTarget(null);
      setInsufficientCredits(false);
      setStatuses((prev) => [
        ...prev,
        { locale, status: "in_progress", lastError: null, translatedEntities: 0, totalEntities: 0 },
      ]);
    });
  }

  const inactiveLocales = locales.filter((l) => !page.enabled_locales.includes(l));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t.text.replace("{locale}", LOCALE_LABELS[page.default_locale])}
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <span className="text-sm font-medium">{LOCALE_LABELS[page.default_locale]}</span>
          <span className="text-xs text-muted-foreground">{t.mainLocaleBadge}</span>
        </div>
        {statuses.map((row) => (
          <div
            key={row.locale}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              {STATUS_ICON[row.status]}
              {LOCALE_LABELS[row.locale]}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {statusLabel(row.status)}
                {row.totalEntities > 0 &&
                  ` · ${t.entitiesProgress
                    .replace("{translated}", String(row.translatedEntities))
                    .replace("{total}", String(row.totalEntities))}`}
              </span>
              {row.status === "error" && (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => retry(row.locale)}>
                  {t.retry}
                </Button>
              )}
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => deactivate(row.locale)}>
                {t.deactivate}
              </Button>
            </span>
          </div>
        ))}
      </div>

      {inactiveLocales.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t.addLanguage}</p>
          <div className="flex flex-wrap gap-2">
            {inactiveLocales.map((l) => (
              <Button
                key={l}
                size="sm"
                variant="outline"
                onClick={() => setActivateTarget(l)}
              >
                {LOCALE_LABELS[l]}
              </Button>
            ))}
          </div>
        </div>
      )}

      <Dialog open={activateTarget !== null} onOpenChange={(v) => !v && setActivateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activateTarget ? t.activateTitle.replace("{locale}", LOCALE_LABELS[activateTarget]) : ""}
            </DialogTitle>
            <DialogDescription>
              {t.activateCost.replace("{cost}", String(STOREFRONT_LANGUAGE_COST))}
              <br />
              {t.activateBalance.replace("{balance}", String(balance))}
            </DialogDescription>
          </DialogHeader>
          {insufficientCredits && (
            <p className="text-sm text-destructive">{t.insufficientCredits}</p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{t.cancel}</Button>
            </DialogClose>
            <Button onClick={confirmActivate} disabled={pending || insufficientCredits}>
              {t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
