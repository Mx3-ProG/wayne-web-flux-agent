"use client";

import { useState } from "react";
import { Loader2, WandSparkles } from "lucide-react";
import { getTool } from "@/lib/tools-config";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";

const TOOL_SLUG = "posts";

const FORMATS = [
  { value: "reel", label: "Reel / vidéo courte" },
  { value: "carrousel", label: "Carrousel" },
  { value: "post", label: "Post simple" },
];
const OBJECTIFS = [
  { value: "visibilite", label: "Toucher un max de monde" },
  { value: "expertise", label: "Prouver mon expertise" },
  { value: "conversion", label: "Donner envie de réserver" },
];

// Étape 6 : la SEULE étape facturée du tunnel (25 cr. sur les 100 offerts).
// C'est volontaire — c'est ici que le crédit prend un sens concret, en
// produisant quelque chose de publiable tout de suite.
export function StepContent({
  gain,
  balance,
  done,
  onDone,
}: {
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
          setError("Il te manque des crédits pour cette génération.");
        } else if (body?.error === "ai_window_expired") {
          setError(
            "Ton essai est terminé : tes crédits continuent de payer tes modifications, mais les générations IA demandent une formule FLUX."
          );
        } else if (body?.error === "subscription_required") {
          setError(
            "Ton essai est terminé et ton solde est vide. Choisis une formule pour continuer."
          );
        } else if (body?.error === "content_blocked") {
          setError("Ce sujet ne passe pas la modération. Reformule-le.");
        } else {
          setError("La génération a échoué. Réessaie dans un instant.");
        }
        return;
      }

      setOutput(await response.text());
      onDone();
    } catch {
      setError("La génération a échoué. Réessaie dans un instant.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Question
      kicker="Étape 6 · Ton premier contenu"
      title={<>Ta première <em>publication</em> t&apos;attend.</>}
      subtitle="L'IA connaît maintenant ton métier, ta ville, ton catalogue et ton ton. Regarde ce qu'elle en fait."
      gain={gain}
    >
      <p className={styles.costBadge}>
        {cost} crédits sur tes {balance} · c&apos;est la seule étape payante du parcours
      </p>

      <div className={styles.contentForm}>
        <label>
          <span>Type de contenu</span>
          <select value={format} onChange={(event) => setFormat(event.target.value)}>
            {FORMATS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Il sert à quoi, ce post ?</span>
          <select value={objectif} onChange={(event) => setObjectif(event.target.value)}>
            {OBJECTIFS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Le sujet (facultatif)</span>
          <input
            value={sujet}
            onChange={(event) => setSujet(event.target.value)}
            maxLength={400}
            placeholder="Ex : ma prestation phare, une astuce, un avant/après…"
          />
        </label>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {output ? (
        <div className={styles.output}>
          <p className={styles.outputLabel}>Ton contenu — il est déjà dans ton coffre.</p>
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
              <Loader2 aria-hidden="true" className={styles.spin} /> L&apos;IA écrit…
            </>
          ) : (
            <>
              Générer mon premier contenu <WandSparkles aria-hidden="true" />
            </>
          )}
        </button>
      )}

      {done && output && (
        <p className={styles.outputNote}>
          Tu peux le retrouver à tout moment dans ton coffre.
        </p>
      )}
    </Question>
  );
}
