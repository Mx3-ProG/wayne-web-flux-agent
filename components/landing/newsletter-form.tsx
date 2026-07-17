"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import styles from "@/app/home.module.css";

type Status = "idle" | "sending" | "done" | "error";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/marketing/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className={styles.formSuccess} role="status">
        <Check aria-hidden="true" />
        C&apos;est noté ! Le prochain conseil arrive directement dans ta boîte.
      </p>
    );
  }

  return (
    <form className={styles.newsletterForm} onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="newsletter-email">
        Ton adresse email
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        placeholder="ton.email@commerce.fr"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        className={`flux-button-smooth ${styles.primaryCta}`}
        type="submit"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Un instant…" : "Je m'abonne"}
        <ArrowRight aria-hidden="true" />
      </button>
      {status === "error" && (
        <p className={styles.formError} role="alert">
          Oups, ça n&apos;est pas passé. Vérifie ton adresse et réessaie.
        </p>
      )}
    </form>
  );
}
