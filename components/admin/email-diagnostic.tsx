"use client";

import { useActionState } from "react";
import {
  runEmailDiagnostic,
  type EmailDiagnosticState,
} from "@/app/[adminKey]/securite/actions";

const initial: EmailDiagnosticState = {};

type EmailConfig = {
  hasKey: boolean;
  from: string;
  fromDomain: string | null;
  isDevFallback: boolean;
  replyTo: string | null;
};

// Panneau de diagnostic email : montre l'état de config (clé, expéditeur,
// domaine à vérifier dans Resend) et permet d'envoyer un vrai email de test qui
// remonte l'erreur exacte de Resend en cas d'échec.
export function EmailDiagnostic({ config }: { config: EmailConfig }) {
  const [state, action, pending] = useActionState(runEmailDiagnostic, initial);
  const ok = (label: string) => `✅ ${label}`;
  const ko = (label: string) => `⛔ ${label}`;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ul style={{ display: "grid", gap: 4, listStyle: "none", padding: 0, margin: 0 }}>
        <li>{config.hasKey ? ok("RESEND_API_KEY présente") : ko("RESEND_API_KEY absente — aucun email ne partira")}</li>
        <li>
          {config.isDevFallback
            ? ko("EMAIL_FROM absente — fallback onboarding@resend.dev (dev seulement)")
            : ok(`Expéditeur : ${config.from}`)}
        </li>
        {config.fromDomain && (
          <li>
            ℹ️ Domaine à vérifier dans Resend : <code>{config.fromDomain}</code>
          </li>
        )}
        <li>{config.replyTo ? ok(`Reply-To : ${config.replyTo}`) : "ℹ️ EMAIL_REPLY_TO non défini"}</li>
      </ul>

      <form action={action} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <label>
          Envoyer un email de test à
          <input name="to" type="email" placeholder="vous@exemple.fr" required />
        </label>
        <button type="submit" disabled={pending}>{pending ? "Envoi…" : "Tester l'envoi"}</button>
      </form>

      {state.error && <span role="alert" style={{ color: "#ff9ca3" }}>{state.error}</span>}
      {state.message && <span role="status" style={{ color: "#8ee4b5" }}>{state.message}</span>}
    </div>
  );
}
