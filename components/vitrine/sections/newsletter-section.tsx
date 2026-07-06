"use client";

import { useState } from "react";
import styles from "../vitrine.module.css";

type Props = {
  slug: string;
  accent: string;
  title?: string;
  description?: string;
  interactive?: boolean; // false en préview éditeur
  first?: boolean;
};

export function NewsletterSection({
  slug,
  accent,
  title,
  description,
  interactive = true,
  first = false,
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
          <p>Restons en lien</p>
          <h2>{title || "Reste informé"}</h2>
          <span>
            {description || "Reçois mes offres et mes nouveautés, sans spam."}
          </span>
        </div>
        {state === "done" ? (
          <p className={styles.newsletterDone}>Merci ! C&apos;est noté. ✨</p>
        ) : (
          <form className={styles.newsletterForm} onSubmit={subscribe}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.fr"
              aria-label="Ton adresse email"
            />
            <button
              type="submit"
              disabled={state === "sending"}
              style={{ backgroundColor: accent }}
            >
              {state === "sending" ? "…" : "S'inscrire"}
            </button>
          </form>
        )}
        {state === "error" && (
          <p className={styles.newsletterError}>
            Impossible de t&apos;inscrire pour le moment. Réessaie plus tard.
          </p>
        )}
      </div>
    </div>
  );
}
