"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { setDashboardLocale } from "@/app/(app)/locale-actions";
import { LOCALE_LABELS, locales, type Locale } from "@/lib/i18n/config";
import { ACCOUNT_LANGUAGE_CHANGE_COST } from "@/lib/plans";
import { useI18n } from "@/components/i18n-provider";
import styles from "./dashboard-language-switcher.module.css";

const FLAGS: Record<Locale, string> = {
  fr: "🇫🇷", en: "🇬🇧", es: "🇪🇸", de: "🇩🇪", it: "🇮🇹", ru: "🇷🇺", zh: "🇨🇳", ja: "🇯🇵", ar: "🇸🇦",
};
const fill = (value: string, cost: number) => value.replace("{cost}", String(cost));

export function DashboardLanguageSwitcher() {
  const { locale, dictionary, languageChangeFree } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function select(target: Locale) {
    if (target === locale || pending) return;
    // Tant qu'aucune boutique n'existe, fixer sa langue principale est gratuit :
    // pas de dialogue de coût. Sinon on confirme la dépense de 25 crédits.
    if (
      !languageChangeFree &&
      !window.confirm(fill(dictionary.language.change, ACCOUNT_LANGUAGE_CHANGE_COST))
    ) {
      return;
    }
    startTransition(async () => {
      const result = await setDashboardLocale(target);
      if (result.error === "insufficient_credits") {
        setMessage(fill(dictionary.language.insufficient, ACCOUNT_LANGUAGE_CHANGE_COST));
        return;
      }
      if (result.error) {
        setMessage(dictionary.language.error);
        return;
      }
      setMessage(dictionary.language.success);
      router.refresh();
    });
  }

  return (
    <details className={styles.switcher}>
      <summary aria-label={dictionary.language.aria}>
        <Globe2 aria-hidden="true" />
        <span>{FLAGS[locale]}</span>
        <ChevronDown aria-hidden="true" />
      </summary>
      <div className={styles.popover}>
        <strong>{dictionary.language.title}</strong>
        <small>{dictionary.language.description}</small>
        {locales.map((item) => (
          <button key={item} type="button" disabled={pending} onClick={() => select(item)}>
            <span>{FLAGS[item]}</span><span>{LOCALE_LABELS[item]}</span>
            {item === locale && <Check aria-hidden="true" />}
          </button>
        ))}
        {message && <p>{message}</p>}
      </div>
    </details>
  );
}
