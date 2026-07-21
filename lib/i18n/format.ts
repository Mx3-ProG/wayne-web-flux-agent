import { LOCALE_BCP47, type Locale } from "./config";

export function formatNumber(locale: Locale, value: number): string {
  return value.toLocaleString(LOCALE_BCP47[locale]);
}

export function formatCurrency(
  locale: Locale,
  value: number,
  currency = "EUR"
): string {
  return new Intl.NumberFormat(LOCALE_BCP47[locale], {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

export function formatDate(
  locale: Locale,
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: "long" }
): string {
  return new Intl.DateTimeFormat(LOCALE_BCP47[locale], options).format(
    new Date(date)
  );
}
