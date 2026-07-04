"use client";

import { useEffect, useRef, useState } from "react";

// Classe par défaut : reprend le style du composant Input (shadcn) pour se
// fondre dans le dashboard. Surchargée si `className` est fourni (ex. tunnels).
const DEFAULT_CLASS =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30";

function centsToText(cents: number): string {
  if (!cents) return ""; // 0 → champ vide (le placeholder prend le relais)
  const s = (cents / 100).toFixed(2);
  return s.replace(/\.00$/, "").replace(".", ",");
}

type Props = {
  cents: number;
  onCents: (cents: number) => void;
  className?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

// Saisie de prix intuitive : champ vide quand 0 (pas de « 0 » à effacer), pas
// de flèches (type text), virgule OU point acceptés, clavier numérique sur
// mobile, tout sélectionné au focus. Émet la valeur en centimes.
export function PriceInput({
  cents,
  onCents,
  className,
  id,
  placeholder = "0",
  disabled,
  ...aria
}: Props) {
  const [text, setText] = useState(() => centsToText(cents));
  const focused = useRef(false);

  // Reflète les changements externes (ex. reset) uniquement hors focus.
  useEffect(() => {
    if (!focused.current) setText(centsToText(cents));
  }, [cents]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const sep = raw.includes(",") ? "," : ".";
    const norm = raw.replace(/[^\d.,]/g, "").replace(",", ".");
    const dot = norm.indexOf(".");
    const intPart = (dot === -1 ? norm : norm.slice(0, dot)).slice(0, 9);
    const decPart = dot === -1 ? "" : norm.slice(dot + 1).replace(/\./g, "").slice(0, 2);

    const display =
      raw.trim() === ""
        ? ""
        : dot === -1
          ? intPart
          : `${intPart}${sep}${decPart}`;
    setText(display);

    const value = parseFloat(`${intPart || "0"}.${decPart || "0"}`);
    onCents(Number.isFinite(value) ? Math.max(0, Math.round(value * 100)) : 0);
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      className={className ?? DEFAULT_CLASS}
      onFocus={(e) => {
        focused.current = true;
        e.currentTarget.select();
      }}
      onBlur={() => {
        focused.current = false;
        setText(centsToText(cents));
      }}
      onChange={handleChange}
      {...aria}
    />
  );
}
