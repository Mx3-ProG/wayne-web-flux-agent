"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import styles from "@/app/home.module.css";

type Status = "idle" | "sending" | "done" | "error";

export function ContactForm() {
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
          Message bien reçu ! On te répond sous 24 h ouvrées, promis.
        </p>
        <p className={styles.contactDoneHint}>
          En attendant, pourquoi ne pas prendre une longueur d&apos;avance ?
        </p>
        <a className={styles.textCta} href="/commencer">
          Créer ma boutique maintenant
        </a>
      </div>
    );
  }

  return (
    <form className={styles.contactCard} onSubmit={handleSubmit}>
      <div className={styles.contactField}>
        <label htmlFor="contact-name">Ton prénom (ou ton commerce)</label>
        <input
          id="contact-name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          placeholder="Ex. Sophie, Fleurs & Merveilles"
          autoComplete="name"
        />
      </div>
      <div className={styles.contactField}>
        <label htmlFor="contact-email">Ton email</label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          placeholder="ton.email@commerce.fr"
          autoComplete="email"
        />
      </div>
      <div className={styles.contactField}>
        <label htmlFor="contact-message">Ton message</label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder="Raconte-nous ton projet, ta question, ton besoin… on lit tout."
        />
      </div>
      <button
        className={`flux-button-smooth ${styles.primaryCta}`}
        type="submit"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Envoi en cours…" : "Envoyer mon message"}
        <ArrowRight aria-hidden="true" />
      </button>
      {status === "error" && (
        <p className={styles.formError} role="alert">
          L&apos;envoi a échoué. Réessaie, ou écris-nous directement par email.
        </p>
      )}
    </form>
  );
}
