"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Globe, Lock } from "lucide-react";
import { setCustomDomain } from "./actions";
import styles from "./projets.module.css";

export function DomainSettings({
  pageId,
  domain,
  editable,
}: {
  pageId: string;
  domain: string | null;
  editable: boolean;
}) {
  const [value, setValue] = useState(domain ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <section className={styles.domain}>
      <div className={styles.domainHead}>
        <Globe aria-hidden="true" />
        <div>
          <strong>Nom de domaine</strong>
          <p>
            Branche ton propre domaine (ex. <code>ma-boutique.fr</code>) sur la
            vitrine du projet actif.
          </p>
        </div>
        {!editable && (
          <span className={styles.soon}>
            <Lock aria-hidden="true" /> Bientôt · forfait Plus
          </span>
        )}
      </div>

      <div className={styles.domainRow}>
        <input
          className={styles.domainInput}
          value={value}
          placeholder="ma-boutique.fr"
          disabled={!editable || pending}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          type="button"
          className={styles.domainBtn}
          disabled={!editable || pending}
          onClick={() =>
            startTransition(async () => {
              const r = await setCustomDomain(pageId, value);
              if (r.error) toast.error(r.error);
              else toast.success("Domaine enregistré.");
            })
          }
        >
          {pending ? "…" : "Enregistrer"}
        </button>
      </div>
      {!editable && (
        <p className={styles.domainNote}>
          Cette fonctionnalité arrive prochainement en production. Elle est déjà
          testable en local.
        </p>
      )}
    </section>
  );
}
