"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Globe, Lock } from "lucide-react";
import { setCustomDomain } from "./actions";
import styles from "./projets.module.css";
import type { ProjectsDict } from "@/lib/i18n/get-dictionary";

export function DomainSettings({
  pageId,
  domain,
  editable,
  t,
}: {
  pageId: string;
  domain: string | null;
  editable: boolean;
  t: ProjectsDict;
}) {
  const [value, setValue] = useState(domain ?? "");
  const [pending, startTransition] = useTransition();
  const [before, after] = t.domain.text.split("{example}");

  return (
    <section className={styles.domain}>
      <div className={styles.domainHead}>
        <Globe aria-hidden="true" />
        <div>
          <strong>{t.domain.title}</strong>
          <p>
            {before}
            <code>ma-boutique.fr</code>
            {after}
          </p>
        </div>
        {!editable && (
          <span className={styles.soon}>
            <Lock aria-hidden="true" /> {t.domain.soon}
          </span>
        )}
      </div>

      <div className={styles.domainRow}>
        <input
          className={styles.domainInput}
          value={value}
          placeholder={t.domain.placeholder}
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
              if (r.error) toast.error(t.errors[r.error as keyof typeof t.errors] ?? t.errors.unknown);
              else toast.success(t.domain.saved);
            })
          }
        >
          {pending ? t.domain.saving : t.domain.save}
        </button>
      </div>
      {!editable && (
        <p className={styles.domainNote}>{t.domain.comingSoon}</p>
      )}
    </section>
  );
}
