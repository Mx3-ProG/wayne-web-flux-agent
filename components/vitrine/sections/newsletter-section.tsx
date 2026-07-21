"use client";

import { useState } from "react";
import styles from "../vitrine.module.css";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";
import frStorefront from "@/lib/i18n/dictionaries/fr/storefront.json";

type Props = {
  slug: string;
  accent: string;
  title?: string;
  description?: string;
  interactive?: boolean; // false en préview éditeur
  first?: boolean;
  t?: StorefrontDict["sections"]["newsletter"];
};

export function NewsletterSection({
  slug,
  accent,
  title,
  description,
  interactive = true,
  first = false,
  t = frStorefront.sections.newsletter,
}: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!interactive || !email.trim()) return;
    setState("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email: email.trim() }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className={`${styles.contentSection} ${first ? styles.firstInGroup : ""}`}>
      <div className={styles.newsletter}>
        <div className={styles.sectionHeading}>
          <p>{t.eyebrow}</p>
          <h2>{title || t.title}</h2>
          <span>{description || t.subtitle}</span>
        </div>
        {state === "done" ? (
          <p className={styles.newsletterDone}>{t.done}</p>
        ) : (
          <form className={styles.newsletterForm} onSubmit={subscribe}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              aria-label={t.emailAria}
            />
            <button
              type="submit"
              disabled={state === "sending"}
              style={{ backgroundColor: accent }}
            >
              {state === "sending" ? t.sending : t.subscribe}
            </button>
          </form>
        )}
        {state === "error" && (
          <p className={styles.newsletterError}>{t.error}</p>
        )}
      </div>
    </div>
  );
}
