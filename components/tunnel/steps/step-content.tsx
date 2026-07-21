"use client";

import { useState } from "react";
import { Loader2, WandSparkles } from "lucide-react";
import { getTool } from "@/lib/tools-config";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";

const TOOL_SLUG = "posts";

// Étape 6 : la SEULE étape facturée du tunnel (25 cr. sur les 100 offerts).
// C'est volontaire — c'est ici que le crédit prend un sens concret, en
// produisant quelque chose de publiable tout de suite.
export function StepContent({
  dict,
  gain,
  balance,
  done,
  onDone,
}: {
  dict: TunnelDict["content"];
  gain: string;
  balance: number;
  done: boolean;
  onDone: () => void;
}) {
  const cost = getTool(TOOL_SLUG)?.cost ?? 25;
  const [format, setFormat] = useState("reel");
  const [objectif, setObjectif] = useState("conversion");
  const [sujet, setSujet] = useState("");
  const [output, setOutput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const formats = Object.entries(dict.formats).map(([value, label]) => ({ value, label }));
  const goals = Object.entries(dict.goals).map(([value, label]) => ({ value, label }));

  async function generate() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: TOOL_SLUG,
          inputs: { format, objectif, ...(sujet.trim() ? { sujet } : {}) },
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        // Mêmes codes que partout ailleurs : l'essai expiré et le solde vide
        // sont des situations normales, pas des bugs.
        if (body?.error === "insufficient_credits") {
          setError(dict.errors.insufficientCredits);
        } else if (
          body?.error === "ai_window_expired" ||
          body?.error === "subscription_required"
        ) {
          setError(
            dict.errors.trialExpired
          );
        } else if (body?.error === "content_blocked") {
          setError(dict.errors.contentBlocked);
        } else {
          setError(dict.errors.generic);
        }
        return;
      }

      setOutput(await response.text());
      onDone();
    } catch {
      setError(dict.errors.generic);
    } finally {
      setPending(false);
    }
  }

  return (
    <Question
      kicker={dict.kicker}
      title={<>{dict.titleStart} <em>{dict.titleEm}</em> {dict.titleEnd}</>}
      subtitle={dict.subtitle}
      gain={gain}
    >
      <p className={styles.costBadge}>
        {dict.costBadge.replace("{cost}", String(cost)).replace("{balance}", String(balance))}
      </p>

      <div className={styles.contentForm}>
        <label>
          <span>{dict.formatLabel}</span>
          <select value={format} onChange={(event) => setFormat(event.target.value)}>
            {formats.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{dict.goalLabel}</span>
          <select value={objectif} onChange={(event) => setObjectif(event.target.value)}>
            {goals.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{dict.topicLabel}</span>
          <input
            value={sujet}
            onChange={(event) => setSujet(event.target.value)}
            maxLength={400}
            placeholder={dict.topicPlaceholder}
          />
        </label>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {output ? (
        <div className={styles.output}>
          <p className={styles.outputLabel}>{dict.outputLabel}</p>
          <pre>{output}</pre>
        </div>
      ) : (
        <button
          className={`flux-button-smooth ${styles.primary} ${styles.centered}`}
          type="button"
          onClick={generate}
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2 aria-hidden="true" className={styles.spin} /> {dict.generating}
            </>
          ) : (
            <>
              {dict.generate} <WandSparkles aria-hidden="true" />
            </>
          )}
        </button>
      )}

      {done && output && (
        <p className={styles.outputNote}>
          {dict.outputNote}
        </p>
      )}
    </Question>
  );
}
