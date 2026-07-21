"use client";

import { Check, Globe2 } from "lucide-react";
import { LOCALE_LABELS, locales, type Locale } from "@/lib/i18n/config";
import styles from "@/app/commencer/tunnel.module.css";

const FLAGS: Record<Locale, string> = {
  fr: "🇫🇷", en: "🇬🇧", es: "🇪🇸", de: "🇩🇪", it: "🇮🇹", ru: "🇷🇺", zh: "🇨🇳", ja: "🇯🇵", ar: "🇸🇦",
};
const COPY: Record<Locale, { kicker: string; title: string; subtitle: string }> = {
  fr: { kicker: "Ton lieu de production", title: "Choisis la langue de ton univers.", subtitle: "Ton espace, FLUX et tes nouvelles pages garderont cette langue pendant tout le parcours." },
  en: { kicker: "Your production locale", title: "Choose the language of your world.", subtitle: "Your workspace, FLUX and every new page will keep this language throughout your journey." },
  es: { kicker: "Tu lugar de producción", title: "Elige el idioma de tu universo.", subtitle: "Tu espacio, FLUX y cada página nueva mantendrán este idioma durante todo el recorrido." },
  de: { kicker: "Dein Produktionsort", title: "Wähle die Sprache deiner Welt.", subtitle: "Dein Arbeitsbereich, FLUX und jede neue Seite behalten diese Sprache während des gesamten Wegs." },
  it: { kicker: "Il tuo luogo di produzione", title: "Scegli la lingua del tuo universo.", subtitle: "Il tuo spazio, FLUX e ogni nuova pagina manterranno questa lingua per tutto il percorso." },
  ru: { kicker: "Язык вашего пространства", title: "Выберите язык вашей вселенной.", subtitle: "Ваш кабинет, FLUX и новые страницы будут использовать этот язык на всём пути." },
  zh: { kicker: "你的创作语言", title: "选择你的世界所使用的语言。", subtitle: "你的空间、FLUX 和所有新页面将在整个流程中始终使用该语言。" },
  ja: { kicker: "制作環境の言語", title: "あなたの世界で使う言語を選択。", subtitle: "スペース、FLUX、新しいページは、すべての工程でこの言語を使い続けます。" },
  ar: { kicker: "لغة مساحتك", title: "اختر لغة عالمك.", subtitle: "ستحتفظ مساحتك و FLUX وكل صفحة جديدة بهذه اللغة طوال الرحلة." },
};

export function StepProductionLocale({ value, onChange }: { value: Locale; onChange: (locale: Locale) => void }) {
  const copy = COPY[value];
  return <div className={styles.production}>
    <div className={styles.planet} aria-hidden="true"><Globe2 /></div>
    <p className={styles.kicker}>{copy.kicker}</p><h1>{copy.title}</h1><p className={styles.productionSubtitle}>{copy.subtitle}</p>
    <div className={styles.localeGrid} role="radiogroup">
      {locales.map((locale) => <button key={locale} type="button" role="radio" aria-checked={locale === value} className={locale === value ? styles.localeActive : styles.localeChoice} onClick={() => onChange(locale)}>
        <span>{FLAGS[locale]}</span><strong>{LOCALE_LABELS[locale]}</strong>{locale === value && <Check aria-hidden="true" />}
      </button>)}
    </div>
  </div>;
}
