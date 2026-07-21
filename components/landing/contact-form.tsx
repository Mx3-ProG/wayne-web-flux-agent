"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import styles from "@/app/home.module.css";
import type { LandingDict } from "@/lib/i18n/get-dictionary";

type Status = "idle" | "sending" | "done" | "error";

export function ContactForm({ dict }: { dict: LandingDict["contact"] }) {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    try {
      const res = await fetch("/api/marketing/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("message"),
        }),
      });
      if (res.ok) {
        form.reset();
        setStatus("done");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className={`${styles.contactCard} ${styles.contactCardDone}`}>
        <p className={styles.formSuccess} role="status">
          <Check aria-hidden="true" />
          {dict.success}
        </p>
        <p className={styles.contactDoneHint}>{dict.doneHint}</p>
        <Link className={styles.textCta} href="/commencer">
          {dict.doneCta}
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.contactCard} onSubmit={handleSubmit}>
      <div className={styles.contactField}>
        <label htmlFor="contact-name">{dict.nameLabel}</label>
        <input
          id="contact-name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          placeholder={dict.namePlaceholder}
          autoComplete="name"
        />
      </div>
      <div className={styles.contactField}>
        <label htmlFor="contact-email">{dict.emailLabel}</label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          placeholder={dict.emailPlaceholder}
          autoComplete="email"
        />
      </div>
      <div className={styles.contactField}>
        <label htmlFor="contact-message">{dict.messageLabel}</label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder={dict.messagePlaceholder}
        />
      </div>
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
