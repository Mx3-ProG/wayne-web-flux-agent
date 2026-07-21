"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import styles from "@/app/home.module.css";
import type { LandingDict } from "@/lib/i18n/get-dictionary";

type Status = "idle" | "sending" | "done" | "error";

export function NewsletterForm({ dict }: { dict: LandingDict["newsletter"] }) {
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
        {dict.success}
      </p>
    );
  }

  return (
    <form className={styles.newsletterForm} onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="newsletter-email">
        {dict.emailLabel}
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        placeholder={dict.emailPlaceholder}
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        className={`flux-button-smooth ${styles.primaryCta}`}
        type="submit"
        disabled={status === "sending"}
      >
        {status === "sending" ? dict.sending : dict.submit}
        <ArrowRight aria-hidden="true" />
      </button>
      {status === "error" && (
        <p className={styles.formError} role="alert">
          {dict.error}
        </p>
      )}
    </form>
  );
}
